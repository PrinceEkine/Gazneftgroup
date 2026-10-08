package com.gazneftgroup.mail.core.common

/**
 * Typed result for repository/use-case boundaries. UI layers never see raw
 * exceptions — they see a user-presentable error category.
 */
sealed interface AppResult<out T> {
    data class Success<T>(val data: T) : AppResult<T>
    data class Error(val error: AppError, val cause: Throwable? = null) : AppResult<Nothing>
}

enum class AppError(val userMessage: String) {
    NETWORK("No connection. Showing cached mail — pull to retry."),
    AUTH_EXPIRED("Your email connection has expired. Re-add this account in Settings."),
    RATE_LIMITED("Too many requests right now. Please wait a moment."),
    SERVER("Something went wrong on our side. Please try again."),
    UNKNOWN("Unexpected error. Please try again."),
}

inline fun <T> AppResult<T>.onSuccess(block: (T) -> Unit): AppResult<T> {
    if (this is AppResult.Success) block(data)
    return this
}

inline fun <T> AppResult<T>.onError(block: (AppError) -> Unit): AppResult<T> {
    if (this is AppResult.Error) block(error)
    return this
}
