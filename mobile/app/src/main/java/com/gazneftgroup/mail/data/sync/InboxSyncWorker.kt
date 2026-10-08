package com.gazneftgroup.mail.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.gazneftgroup.mail.core.db.AppDatabase
import com.gazneftgroup.mail.core.db.MessageEntity
import com.gazneftgroup.mail.core.db.SyncStateEntity
import com.gazneftgroup.mail.core.network.FetchEmailsRequest
import com.gazneftgroup.mail.core.network.MailApi
import com.gazneftgroup.mail.data.account.AccountRepository
import com.google.firebase.auth.FirebaseAuth
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import java.time.Duration
import java.time.Instant

/**
 * Periodic envelope sync so the inbox is warm when the app opens.
 *
 * Scale posture: WorkManager schedules with OS-level flex windows, so a
 * million devices do NOT sync at the same wall-clock second; combined with
 * UNMETERED-friendly constraints and small envelope payloads this keeps
 * steady-state backend load flat and spread out. Push (FCM) is the intended
 * primary trigger for new-mail freshness; this is the fallback.
 */
@HiltWorker
class InboxSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val api: MailApi,
    private val db: AppDatabase,
    private val accountRepository: AccountRepository,
    private val auth: FirebaseAuth,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        if (auth.currentUser == null) return Result.success()

        val accounts = runCatching { accountRepository.observeAccounts().first() }
            .getOrElse { return Result.retry() }

        var anyFailure = false
        for (account in accounts) {
            try {
                val credentials = accountRepository.getCredentials(account.id) ?: continue
                val response = api.fetchEmails(
                    FetchEmailsRequest(
                        imapConfig = credentials.imap,
                        folder = "INBOX",
                        limit = 25,
                        authType = credentials.authType,
                        accessToken = credentials.accessToken,
                        refreshToken = credentials.refreshToken,
                    )
                )
                if (!response.success) {
                    anyFailure = true
                    continue
                }
                val entities = response.messages.map { dto ->
                    MessageEntity(
                        id = "${account.id}:INBOX:${dto.uid}",
                        uid = dto.uid,
                        accountId = account.id,
                        folder = "INBOX",
                        subject = dto.subject,
                        fromAddress = dto.from,
                        toAddress = dto.to.orEmpty(),
                        date = runCatching { Instant.parse(dto.date).toEpochMilli() }
                            .getOrElse { System.currentTimeMillis() },
                        snippet = dto.snippet,
                        body = dto.body,
                        isRead = dto.isRead,
                        hasAttachments = false,
                        bodyFetched = false,
                    )
                }
                db.messageDao().upsertEnvelopes(entities)
                val previous = db.syncStateDao().get(account.id, "INBOX")
                db.syncStateDao().upsert(
                    SyncStateEntity(
                        accountId = account.id,
                        folder = "INBOX",
                        fetchedCount = maxOf(entities.size, previous?.fetchedCount ?: 0),
                        endReached = previous?.endReached ?: false,
                        lastRefreshedAt = System.currentTimeMillis(),
                    )
                )
            } catch (_: Exception) {
                anyFailure = true
            }
        }
        return if (anyFailure) Result.retry() else Result.success()
    }

    companion object {
        private const val UNIQUE_NAME = "gnmail-inbox-sync"

        fun schedule(workManager: WorkManager) {
            val request = PeriodicWorkRequestBuilder<InboxSyncWorker>(Duration.ofMinutes(30))
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .setRequiresBatteryNotLow(true)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, Duration.ofMinutes(5))
                .build()
            workManager.enqueueUniquePeriodicWork(
                UNIQUE_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }
    }
}
