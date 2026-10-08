package com.gazneftgroup.mail.core.network

import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import okhttp3.Interceptor
import okhttp3.Response
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Attaches the caller's Firebase ID token to every API request so the backend
 * can verify identity server-side (Bearer token, verified with firebase-admin).
 *
 * The Firebase SDK caches the token and only refreshes near expiry, so this
 * adds no per-request network cost in the steady state.
 */
@Singleton
class FirebaseAuthInterceptor @Inject constructor(
    private val auth: FirebaseAuth,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val user = auth.currentUser ?: return chain.proceed(chain.request())

        val token = runCatching {
            Tasks.await(user.getIdToken(false), 10, TimeUnit.SECONDS).token
        }.getOrNull()

        val request = if (token != null) {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
