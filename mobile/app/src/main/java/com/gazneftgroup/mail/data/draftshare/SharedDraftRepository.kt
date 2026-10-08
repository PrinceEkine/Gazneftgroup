package com.gazneftgroup.mail.data.draftshare

import com.gazneftgroup.mail.core.common.AppError
import com.gazneftgroup.mail.core.common.AppResult
import com.gazneftgroup.mail.core.common.IoDispatcher
import com.gazneftgroup.mail.core.crypto.DraftCrypto
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.security.SecureRandom
import java.time.Instant
import javax.crypto.AEADBadTagException
import javax.inject.Inject
import javax.inject.Singleton

data class ShareableDraft(val to: String, val subject: String, val body: String)

/**
 * GNmail-to-GNmail draft sharing. See DraftCrypto for the E2E encryption
 * contract shared with the web client; Firestore rules restrict reads to
 * signed-in GNmail users, and the PIN (exchanged out-of-band) is the key.
 */
@Singleton
class SharedDraftRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
) {

    suspend fun share(draft: ShareableDraft, pin: String): AppResult<String> =
        withContext(ioDispatcher) {
            if (auth.currentUser == null) return@withContext AppResult.Error(AppError.AUTH_EXPIRED)
            if (!pin.matches(Regex("\\d{4,8}"))) {
                return@withContext AppResult.Error(AppError.UNKNOWN, IllegalArgumentException("PIN must be 4–8 digits"))
            }
            try {
                val payload = JSONObject()
                    .put("to", draft.to)
                    .put("subject", draft.subject)
                    .put("body", draft.body)
                    .toString()
                val encrypted = DraftCrypto.encrypt(payload, pin)
                val code = randomCode()

                firestore.collection("sharedDrafts").document(code).set(
                    mapOf(
                        "ownerUid" to auth.currentUser!!.uid,
                        "alg" to "AES-256-GCM",
                        "kdf" to "PBKDF2-SHA256/${DraftCrypto.KDF_ITERATIONS}",
                        "salt" to encrypted.saltB64,
                        "iv" to encrypted.ivB64,
                        "ciphertext" to encrypted.ciphertextB64,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "expiresAt" to Instant.now().plusSeconds(SHARE_TTL_SECONDS).toString(),
                    )
                ).await()
                AppResult.Success(code)
            } catch (e: Exception) {
                AppResult.Error(AppError.NETWORK, e)
            }
        }

    suspend fun import(code: String, pin: String): AppResult<ShareableDraft> =
        withContext(ioDispatcher) {
            try {
                val doc = firestore.collection("sharedDrafts")
                    .document(code.trim().uppercase())
                    .get().await()
                if (!doc.exists()) {
                    return@withContext AppResult.Error(AppError.UNKNOWN, NoSuchElementException("No shared draft with that code"))
                }
                doc.getString("expiresAt")?.let {
                    if (Instant.parse(it) < Instant.now()) {
                        return@withContext AppResult.Error(AppError.UNKNOWN, IllegalStateException("This share has expired"))
                    }
                }
                val plaintext = DraftCrypto.decrypt(
                    DraftCrypto.Encrypted(
                        saltB64 = doc.getString("salt")!!,
                        ivB64 = doc.getString("iv")!!,
                        ciphertextB64 = doc.getString("ciphertext")!!,
                    ),
                    pin,
                )
                val json = JSONObject(plaintext)
                AppResult.Success(
                    ShareableDraft(
                        to = json.optString("to"),
                        subject = json.optString("subject"),
                        body = json.optString("body"),
                    )
                )
            } catch (e: AEADBadTagException) {
                AppResult.Error(AppError.UNKNOWN, e) // wrong PIN
            } catch (e: Exception) {
                AppResult.Error(AppError.NETWORK, e)
            }
        }

    private fun randomCode(length: Int = 8): String {
        val alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        val random = SecureRandom()
        return buildString(length) {
            repeat(length) { append(alphabet[random.nextInt(alphabet.length)]) }
        }
    }

    private companion object {
        const val SHARE_TTL_SECONDS = 7L * 24 * 60 * 60
    }
}
