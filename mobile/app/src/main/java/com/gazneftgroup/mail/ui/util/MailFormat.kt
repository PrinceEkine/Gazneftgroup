package com.gazneftgroup.mail.ui.util

import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Presentation helpers for mail headers. Pure Kotlin so they are unit-testable. */
object MailFormat {

    private val angleAddress = Regex("""^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$""")

    /** `"Jane Doe" <jane@x.com>` -> `Jane Doe`; `jane@x.com` -> `jane`. */
    fun displayName(from: String): String {
        val match = angleAddress.find(from)
        if (match != null) {
            val name = match.groupValues[1].trim()
            if (name.isNotEmpty()) return name
            return match.groupValues[2].substringBefore('@')
        }
        val trimmed = from.trim()
        return if ('@' in trimmed) trimmed.substringBefore('@') else trimmed.ifEmpty { "Unknown sender" }
    }

    /** The bare email address inside a header, or null if none can be found. */
    fun address(from: String): String? {
        angleAddress.find(from)?.let { return it.groupValues[2].trim() }
        val trimmed = from.trim()
        return trimmed.takeIf { '@' in it }
    }

    /** Up to two initials from a display name or address. */
    fun initials(name: String): String {
        val clean = displayName(name)
            .replace(Regex("[^\\p{L}\\p{N} ]"), " ")
            .trim()
        if (clean.isEmpty()) return "?"
        val parts = clean.split(Regex("\\s+")).filter { it.isNotEmpty() }
        return if (parts.size >= 2) {
            "${parts[0].first()}${parts[1].first()}".uppercase()
        } else {
            parts[0].take(2).uppercase()
        }
    }

    /**
     * Compact list timestamp like Gmail: time of day for today, `8 Oct` for
     * this year, and a short date otherwise.
     */
    fun listDate(epochMillis: Long, now: Long = System.currentTimeMillis()): String {
        val locale = Locale.getDefault()
        val then = Calendar.getInstance().apply { timeInMillis = epochMillis }
        val today = Calendar.getInstance().apply { timeInMillis = now }
        val sameYear = then.get(Calendar.YEAR) == today.get(Calendar.YEAR)
        val sameDay = sameYear && then.get(Calendar.DAY_OF_YEAR) == today.get(Calendar.DAY_OF_YEAR)
        return when {
            sameDay -> DateFormat.getTimeInstance(DateFormat.SHORT, locale).format(Date(epochMillis))
            sameYear -> SimpleDateFormat("d MMM", locale).format(Date(epochMillis))
            else -> DateFormat.getDateInstance(DateFormat.SHORT, locale).format(Date(epochMillis))
        }
    }

    /** Full timestamp for the message header, e.g. `8 Oct 2026, 09:41`. */
    fun fullDate(epochMillis: Long): String =
        DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT, Locale.getDefault())
            .format(Date(epochMillis))
}
