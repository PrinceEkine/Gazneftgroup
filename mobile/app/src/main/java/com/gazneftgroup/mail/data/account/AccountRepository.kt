package com.gazneftgroup.mail.data.account

import com.gazneftgroup.mail.core.common.IoDispatcher
import com.gazneftgroup.mail.core.network.ImapConfigDto
import com.gazneftgroup.mail.core.network.SmtpConfigDto
import com.gazneftgroup.mail.domain.model.AuthType
import com.gazneftgroup.mail.domain.model.EmailAccount
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Linked email accounts, stored under /users/{uid}/accounts in Firestore —
 * the same documents the web client writes, so accounts added on web appear
 * on mobile instantly via snapshot listeners.
 */
@Singleton
class AccountRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
) {

    private fun requireUid(): String =
        auth.currentUser?.uid ?: error("Not signed in")

    fun observeAccounts(): Flow<List<EmailAccount>> = callbackFlow {
        val registration = firestore.collection("users")
            .document(requireUid())
            .collection("accounts")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                trySend(snapshot?.documents.orEmpty().mapNotNull { it.toAccount() })
            }
        awaitClose { registration.remove() }
    }.flowOn(ioDispatcher)

    suspend fun getAccount(accountId: String): EmailAccount? =
        firestore.collection("users").document(requireUid())
            .collection("accounts").document(accountId)
            .get().await().toAccount()

    /**
     * Wire credentials for the IMAP/SMTP proxy. Secrets are read on demand and
     * never cached in Room or held in memory beyond the request.
     */
    suspend fun getCredentials(accountId: String): AccountCredentials? {
        val doc = firestore.collection("users").document(requireUid())
            .collection("accounts").document(accountId)
            .get().await()
        val account = doc.toAccount() ?: return null
        return AccountCredentials(
            imap = ImapConfigDto(
                host = account.imapHost,
                port = account.imapPort,
                user = account.email,
                pass = doc.getString("password"),
            ),
            smtp = SmtpConfigDto(
                host = account.smtpHost,
                port = account.smtpPort,
                user = account.email,
                pass = doc.getString("password"),
            ),
            authType = if (account.authType == AuthType.OAUTH2) "oauth2" else "password",
            accessToken = doc.getString("accessToken"),
            refreshToken = doc.getString("refreshToken"),
            fromAddress = account.email,
        )
    }

    suspend fun deleteAccount(accountId: String) {
        firestore.collection("users").document(requireUid())
            .collection("accounts").document(accountId)
            .delete().await()
    }

    private fun DocumentSnapshot.toAccount(): EmailAccount? {
        if (!exists()) return null
        return EmailAccount(
            id = id,
            ownerUid = getString("ownerUid") ?: return null,
            email = getString("email") ?: return null,
            provider = getString("provider") ?: "custom",
            imapHost = getString("imapHost") ?: "",
            imapPort = (getLong("imapPort") ?: 993L).toInt(),
            smtpHost = getString("smtpHost") ?: "",
            smtpPort = (getLong("smtpPort") ?: 465L).toInt(),
            label = getString("label") ?: getString("email").orEmpty(),
            color = getString("color") ?: "#0EA5E9",
            authType = if (getString("authType") == "oauth2") AuthType.OAUTH2 else AuthType.PASSWORD,
            lastSynced = getTimestamp("lastSynced")?.toDate()?.time,
        )
    }
}

data class AccountCredentials(
    val imap: ImapConfigDto,
    val smtp: SmtpConfigDto,
    val authType: String,
    val accessToken: String?,
    val refreshToken: String?,
    val fromAddress: String,
)
