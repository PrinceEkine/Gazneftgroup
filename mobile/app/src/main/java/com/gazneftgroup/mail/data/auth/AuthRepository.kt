package com.gazneftgroup.mail.data.auth

import com.gazneftgroup.mail.core.common.AppError
import com.gazneftgroup.mail.core.common.AppResult
import com.gazneftgroup.mail.domain.model.UserProfile
import android.util.Log
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
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

    /**
     * Mirrors the web client: /users/{uid} profile doc used by the admin side.
     * Best-effort: the user is already signed in by the time this runs, so a
     * Firestore hiccup must not be reported as a failed sign-in.
     */
    private suspend fun ensureProfileDocument() {
        val user = auth.currentUser ?: return
        try {
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
        } catch (e: Exception) {
            Log.w(TAG, "Profile document write failed; continuing signed in", e)
        }
    }

    private inline fun <T> runAuth(block: () -> T): AppResult<T> =
        try {
            AppResult.Success(block())
        } catch (e: FirebaseAuthWeakPasswordException) {
            AppResult.Error(AppError.WEAK_PASSWORD, e)
        } catch (e: FirebaseAuthUserCollisionException) {
            AppResult.Error(AppError.EMAIL_IN_USE, e)
        } catch (e: FirebaseAuthInvalidCredentialsException) {
            AppResult.Error(AppError.INVALID_CREDENTIALS, e)
        } catch (e: FirebaseAuthInvalidUserException) {
            AppResult.Error(AppError.INVALID_CREDENTIALS, e)
        } catch (e: FirebaseAuthException) {
            Log.w(TAG, "Auth failed: ${e.errorCode}", e)
            AppResult.Error(AppError.UNKNOWN, e)
        } catch (e: FirebaseNetworkException) {
            AppResult.Error(AppError.OFFLINE, e)
        } catch (e: FirebaseTooManyRequestsException) {
            AppResult.Error(AppError.RATE_LIMITED, e)
        } catch (e: Exception) {
            Log.w(TAG, "Auth failed unexpectedly", e)
            AppResult.Error(AppError.UNKNOWN, e)
        }

    private companion object {
        const val TAG = "AuthRepository"
    }
}
