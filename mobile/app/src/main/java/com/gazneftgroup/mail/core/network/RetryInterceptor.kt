package com.gazneftgroup.mail.core.network

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import kotlin.math.min
import kotlin.random.Random

/**
 * Exponential backoff with full jitter for transient failures (IOException,
 * 429, 502/503/504). Jitter matters at scale: without it, a backend blip makes
 * a million clients retry in synchronized waves and re-kill the service
 * (thundering herd).
 *
 * Only read-style calls are retried; sends are never retried automatically to
 * avoid duplicate emails — the UI surfaces send failures for explicit retry.
 */
class RetryInterceptor(
    private val maxRetries: Int = 3,
    private val baseDelayMs: Long = 500,
    private val maxDelayMs: Long = 8_000,
) : Interceptor {

    private val retryableStatuses = setOf(429, 502, 503, 504)
    private val nonIdempotentPaths = setOf("/api/send-email")

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.url.encodedPath in nonIdempotentPaths) {
            return chain.proceed(request)
        }

        var lastException: IOException? = null
        var response: Response? = null

        for (attempt in 0..maxRetries) {
            if (attempt > 0) {
                response?.close()
                val expBackoff = min(maxDelayMs, baseDelayMs * (1L shl (attempt - 1)))
                Thread.sleep(Random.nextLong(0, expBackoff + 1)) // full jitter
            }
            try {
                response = chain.proceed(request)
                if (response.code !in retryableStatuses) return response
            } catch (e: IOException) {
                lastException = e
            }
        }
        return response ?: throw (lastException ?: IOException("Request failed"))
    }
}
