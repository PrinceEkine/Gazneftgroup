package com.gazneftgroup.mail.data.auth

import com.gazneftgroup.mail.core.common.AppError
import com.gazneftgroup.mail.core.common.AppResult
import com.gazneftgroup.mail.domain.model.UserProfile
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * App sign-in via Firebase Auth. Firebase Auth is horizontally managed by
 * Google and comfortably handles millions of users — no custom auth server
 * to scale or secure.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
) {

    val currentUser: UserProfile?
        get() = auth.currentUser?.let {
            UserProfile(it.uid, it.email.orEmpty(), it.displayName, it.photoUrl?.toString())
        }

    fun observeAuthState(): Flow<UserProfile?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser?.let {
                UserProfile(it.uid, it.email.orEmpty(), it.displayName, it.photoUrl?.toString())
            })
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    suspend fun signIn(email: String, password: String): AppResult<UserProfile> = runAuth {
        auth.signInWithEmailAndPassword(email, password).await()
        ensureProfileDocument()
        requireNotNull(currentUser)
    }

    suspend fun signUp(email: String, password: String): AppResult<UserProfile> = runAuth {
        auth.createUserWithEmailAndPassword(email, password).await()
        ensureProfileDocument()
        requireNotNull(currentUser)
    }

    fun signOut() = auth.signOut()

    /** Mirrors the web client: /users/{uid} profile doc used by the admin side. */
    private suspend fun ensureProfileDocument() {
        val user = auth.currentUser ?: return
        firestore.collection("users").document(user.uid)
            .set(
                mapOf(
                    "uid" to user.uid,
                    "email" to user.email,
                    "displayName" to user.displayName,
                    "photoURL" to user.photoUrl?.toString(),
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                ),
                SetOptions.merge(),
            ).await()
    }

    private inline fun <T> runAuth(block: () -> T): AppResult<T> =
        try {
            AppResult.Success(block())
        } catch (e: FirebaseAuthException) {
            AppResult.Error(AppError.AUTH_EXPIRED, e)
        } catch (e: Exception) {
            AppResult.Error(AppError.NETWORK, e)
        }
}
