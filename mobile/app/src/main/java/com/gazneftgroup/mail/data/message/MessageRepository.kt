package com.gazneftgroup.mail.data.message

import androidx.paging.ExperimentalPagingApi
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.map
import com.gazneftgroup.mail.core.common.AppError
import com.gazneftgroup.mail.core.common.AppResult
import com.gazneftgroup.mail.core.common.IoDispatcher
import com.gazneftgroup.mail.core.db.AppDatabase
import com.gazneftgroup.mail.core.db.toDomain
import com.gazneftgroup.mail.core.network.FetchMessageBodyRequest
import com.gazneftgroup.mail.core.network.MailApi
import com.gazneftgroup.mail.core.network.MailOptionsDto
import com.gazneftgroup.mail.core.network.SendEmailRequest
import com.gazneftgroup.mail.core.network.UpdateFlagsRequest
import com.gazneftgroup.mail.data.account.AccountRepository
import com.gazneftgroup.mail.domain.model.EmailMessage
import com.gazneftgroup.mail.domain.model.MailFolder
import com.gazneftgroup.mail.domain.model.OutgoingEmail
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageRepository @Inject constructor(
    private val api: MailApi,
    private val db: AppDatabase,
    private val accountRepository: AccountRepository,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
) {

    /** Paged, offline-first message list for one folder of one account. */
    @OptIn(ExperimentalPagingApi::class)
    fun pagedMessages(accountId: String, folder: MailFolder): Flow<PagingData<EmailMessage>> =
        Pager(
            config = PagingConfig(
                pageSize = 25,
                prefetchDistance = 10,
                initialLoadSize = 25,
                enablePlaceholders = false,
            ),
            remoteMediator = MessageRemoteMediator(
                accountId = accountId,
                folder = folder.wireName,
                api = api,
                db = db,
                accountRepository = accountRepository,
            ),
            pagingSourceFactory = { db.messageDao().pagingSource(accountId, folder.wireName) },
        ).flow.map { pagingData -> pagingData.map { it.toDomain() } }

    fun observeMessage(messageId: String): Flow<EmailMessage?> =
        db.messageDao().observeMessage(messageId).map { it?.toDomain() }

    fun observeUnreadCount(accountId: String, folder: MailFolder): Flow<Int> =
        db.messageDao().observeUnreadCount(accountId, folder.wireName)

    /** Fetches the full body once and caches it; cached bodies are never refetched. */
    suspend fun ensureBody(message: EmailMessage): AppResult<Unit> = withContext(ioDispatcher) {
        if (message.body.isNotEmpty()) return@withContext AppResult.Success(Unit)
        runApi {
            val credentials = requireNotNull(accountRepository.getCredentials(message.accountId))
            val response = api.fetchMessageBody(
                FetchMessageBodyRequest(
                    imapConfig = credentials.imap,
                    uid = message.uid,
                    folder = message.folder.wireName,
                    authType = credentials.authType,
                    accessToken = credentials.accessToken,
                    refreshToken = credentials.refreshToken,
                )
            )
            check(response.success) { response.error ?: "Body fetch failed" }
            db.messageDao().updateBody(
                id = message.id,
                body = response.body,
                snippet = response.snippet,
                hasAttachments = response.attachments.isNotEmpty(),
            )
        }
    }

    /**
     * Optimistic read-state: Room is updated immediately (UI reacts instantly),
     * the IMAP flag write happens after and is rolled back on failure.
     */
    suspend fun setRead(message: EmailMessage, isRead: Boolean): AppResult<Unit> =
        withContext(ioDispatcher) {
            db.messageDao().updateReadState(message.id, isRead)
            val result = runApi {
                val credentials = requireNotNull(accountRepository.getCredentials(message.accountId))
                val response = api.updateFlags(
                    UpdateFlagsRequest(
                        imapConfig = credentials.imap,
                        uid = message.uid,
                        flags = listOf("\\Seen"),
                        action = if (isRead) "add" else "remove",
                        folder = message.folder.wireName,
                        authType = credentials.authType,
                        accessToken = credentials.accessToken,
                        refreshToken = credentials.refreshToken,
                    )
                )
                check(response.success) { response.error ?: "Flag update failed" }
            }
            if (result is AppResult.Error) {
                db.messageDao().updateReadState(message.id, !isRead)
            }
            result
        }

    suspend fun send(email: OutgoingEmail): AppResult<String> = withContext(ioDispatcher) {
        runApi {
            val credentials = requireNotNull(accountRepository.getCredentials(email.accountId))
            val response = api.sendEmail(
                SendEmailRequest(
                    smtpConfig = credentials.smtp,
                    mailOptions = MailOptionsDto(
                        from = credentials.fromAddress,
                        to = email.to,
                        subject = email.subject,
                        html = email.body,
                        replyTo = email.replyTo,
                    ),
                    authType = credentials.authType,
                    accessToken = credentials.accessToken,
                    refreshToken = credentials.refreshToken,
                )
            )
            check(response.success) { response.error ?: "Send failed" }
            response.messageId.orEmpty()
        }
    }

    private inline fun <T> runApi(block: () -> T): AppResult<T> =
        try {
            AppResult.Success(block())
        } catch (e: IOException) {
            AppResult.Error(AppError.NETWORK, e)
        } catch (e: retrofit2.HttpException) {
            val error = when (e.code()) {
                401, 403 -> AppError.AUTH_EXPIRED
                429 -> AppError.RATE_LIMITED
                in 500..599 -> AppError.SERVER
                else -> AppError.UNKNOWN
            }
            AppResult.Error(error, e)
        } catch (e: Exception) {
            val expired = e.message?.contains("expired", ignoreCase = true) == true
            AppResult.Error(if (expired) AppError.AUTH_EXPIRED else AppError.UNKNOWN, e)
        }
}
