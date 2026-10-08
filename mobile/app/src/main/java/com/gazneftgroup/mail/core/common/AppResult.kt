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
    OFFLINE("Can't reach GNmail. Check your connection and try again."),
    INVALID_CREDENTIALS("Wrong email or password."),
    EMAIL_IN_USE("An account with this email already exists. Sign in instead."),
    WEAK_PASSWORD("Use a password of at least 6 characters."),
    GOOGLE_NOT_CONFIGURED("Google sign-in isn't set up for this build yet. Use email and password."),
    NO_GOOGLE_ACCOUNT("No Google account found on this phone. Add one in Settings and try again."),
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
