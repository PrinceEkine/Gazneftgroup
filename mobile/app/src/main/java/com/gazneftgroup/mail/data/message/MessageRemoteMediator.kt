package com.gazneftgroup.mail.data.message

import androidx.paging.ExperimentalPagingApi
import androidx.paging.LoadType
import androidx.paging.PagingState
import androidx.paging.RemoteMediator
import androidx.room.withTransaction
import com.gazneftgroup.mail.core.db.AppDatabase
import com.gazneftgroup.mail.core.db.MessageEntity
import com.gazneftgroup.mail.core.db.SyncStateEntity
import com.gazneftgroup.mail.core.network.FetchEmailsRequest
import com.gazneftgroup.mail.core.network.MailApi
import com.gazneftgroup.mail.data.account.AccountRepository
import java.time.Instant
import java.time.format.DateTimeParseException

/**
 * Bridges the IMAP proxy and the Room cache for one (account, folder).
 *
 * Scale notes:
 *  - REFRESH is throttled ([minRefreshIntervalMs]); a pull-to-refresh storm or
 *    config-change loop cannot translate into proxy load.
 *  - The proxy fetches "last N" envelopes; APPEND grows N in pages so history
 *    loads incrementally rather than pulling whole mailboxes.
 *  - Envelope-only sync: bodies (the heavy part) are fetched per-message on
 *    open and cached forever after.
 */
@OptIn(ExperimentalPagingApi::class)
class MessageRemoteMediator(
    private val accountId: String,
    private val folder: String,
    private val api: MailApi,
    private val db: AppDatabase,
    private val accountRepository: AccountRepository,
    private val pageSize: Int = 25,
    private val minRefreshIntervalMs: Long = 60_000,
) : RemoteMediator<Int, MessageEntity>() {

    override suspend fun initialize(): InitializeAction {
        val state = db.syncStateDao().get(accountId, folder)
        val fresh = state != null &&
            System.currentTimeMillis() - state.lastRefreshedAt < minRefreshIntervalMs
        return if (fresh) InitializeAction.SKIP_INITIAL_REFRESH
        else InitializeAction.LAUNCH_INITIAL_REFRESH
    }

    override suspend fun load(
        loadType: LoadType,
        state: PagingState<Int, MessageEntity>,
    ): MediatorResult {
        val syncState = db.syncStateDao().get(accountId, folder)

        val targetCount = when (loadType) {
            LoadType.REFRESH -> pageSize
            // Mail lists only grow downward into history; newest items come
            // from REFRESH, so there is no separate prepend direction.
            LoadType.PREPEND -> return MediatorResult.Success(endOfPaginationReached = true)
            LoadType.APPEND -> {
                if (syncState?.endReached == true) {
                    return MediatorResult.Success(endOfPaginationReached = true)
                }
                (syncState?.fetchedCount ?: 0) + pageSize
            }
        }

        return try {
            val credentials = accountRepository.getCredentials(accountId)
                ?: return MediatorResult.Error(IllegalStateException("Account $accountId not found"))

            val response = api.fetchEmails(
                FetchEmailsRequest(
                    imapConfig = credentials.imap,
                    folder = folder,
                    limit = targetCount,
                    authType = credentials.authType,
                    accessToken = credentials.accessToken,
                    refreshToken = credentials.refreshToken,
                )
            )
            if (!response.success) {
                return MediatorResult.Error(IllegalStateException(response.error ?: "Fetch failed"))
            }

            val entities = response.messages.map { dto ->
                MessageEntity(
                    id = "$accountId:$folder:${dto.uid}",
                    uid = dto.uid,
                    accountId = accountId,
                    folder = folder,
                    subject = dto.subject,
                    fromAddress = dto.from,
                    toAddress = dto.to.orEmpty(),
                    date = parseDate(dto.date),
                    snippet = dto.snippet,
                    body = dto.body,
                    isRead = dto.isRead,
                    hasAttachments = false,
                    bodyFetched = false,
                )
            }

            db.withTransaction {
                // Never wipe the cache on refresh — upsert keeps offline reads
                // available even mid-sync and preserves fetched bodies.
                db.messageDao().upsertEnvelopes(entities)
                db.syncStateDao().upsert(
                    SyncStateEntity(
                        accountId = accountId,
                        folder = folder,
                        fetchedCount = maxOf(entities.size, syncState?.fetchedCount ?: 0),
                        // Server returned fewer than asked ⇒ mailbox exhausted.
                        endReached = entities.size < targetCount,
                        lastRefreshedAt = System.currentTimeMillis(),
                    )
                )
            }

            MediatorResult.Success(endOfPaginationReached = entities.size < targetCount)
        } catch (e: Exception) {
            MediatorResult.Error(e)
        }
    }

    private fun parseDate(raw: String): Long =
        try {
            Instant.parse(raw).toEpochMilli()
        } catch (_: DateTimeParseException) {
            System.currentTimeMillis()
        }
}
