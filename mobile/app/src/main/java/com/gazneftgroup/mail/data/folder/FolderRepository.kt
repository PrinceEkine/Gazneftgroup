package com.gazneftgroup.mail.data.folder

import com.gazneftgroup.mail.core.common.AppError
import com.gazneftgroup.mail.core.common.AppResult
import com.gazneftgroup.mail.core.common.IoDispatcher
import com.gazneftgroup.mail.core.network.ListFoldersRequest
import com.gazneftgroup.mail.core.network.MailApi
import com.gazneftgroup.mail.data.account.AccountRepository
import com.gazneftgroup.mail.domain.model.MailFolder
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The account's real folder list (IMAP LIST via the proxy). Standard folders
 * are classified out — the drawer shows them from [MailFolder.main] /
 * [MailFolder.moreStandard] — so this returns only genuine extra folders
 * plus any standard folder the server reports under an unusual path.
 */
@Singleton
class FolderRepository @Inject constructor(
    private val api: MailApi,
    private val accountRepository: AccountRepository,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
) {

    suspend fun listExtraFolders(accountId: String): AppResult<List<MailFolder>> =
        withContext(ioDispatcher) {
            runApi {
                val credentials = requireNotNull(accountRepository.getCredentials(accountId))
                val response = api.listFolders(
                    ListFoldersRequest(
                        imapConfig = credentials.imap,
                        authType = credentials.authType,
                        accessToken = credentials.accessToken,
                        refreshToken = credentials.refreshToken,
                    )
                )
                check(response.success) { response.error ?: "Folder list failed" }
                response.folders
                    .map { MailFolder.fromListed(it.path, it.specialUse) }
                    .filterIsInstance<MailFolder.Custom>()
                    .distinctBy { it.path }
                    .sortedBy { it.label.lowercase() }
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
