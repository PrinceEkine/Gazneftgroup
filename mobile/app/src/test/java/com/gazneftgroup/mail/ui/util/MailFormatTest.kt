package com.gazneftgroup.mail.ui.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.util.Calendar

class MailFormatTest {

    @Test
    fun `display name prefers the friendly name`() {
        assertEquals("Jane Doe", MailFormat.displayName("\"Jane Doe\" <jane@example.com>"))
        assertEquals("Jane Doe", MailFormat.displayName("Jane Doe <jane@example.com>"))
    }

    @Test
    fun `display name falls back to the mailbox part`() {
        assertEquals("jane", MailFormat.displayName("jane@example.com"))
        assertEquals("jane", MailFormat.displayName("<jane@example.com>"))
        assertEquals("Unknown sender", MailFormat.displayName("   "))
    }

    @Test
    fun `address extracts the bare email`() {
        assertEquals("jane@example.com", MailFormat.address("Jane <jane@example.com>"))
        assertEquals("jane@example.com", MailFormat.address("jane@example.com"))
        assertNull(MailFormat.address("Jane"))
    }

    @Test
    fun `initials use up to two words`() {
        assertEquals("JD", MailFormat.initials("Jane Doe <jane@example.com>"))
        assertEquals("JA", MailFormat.initials("jane@example.com"))
        assertEquals("?", MailFormat.initials("@@@"))
    }

    @Test
    fun `list date is time for today and day-month for this year`() {
        val now = Calendar.getInstance().apply {
            set(2026, Calendar.OCTOBER, 8, 9, 41, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val earlierToday = (now.clone() as Calendar).apply { set(Calendar.HOUR_OF_DAY, 7) }
        val earlierThisYear = (now.clone() as Calendar).apply { set(Calendar.MONTH, Calendar.MARCH) }

        val today = MailFormat.listDate(earlierToday.timeInMillis, now.timeInMillis)
        val thisYear = MailFormat.listDate(earlierThisYear.timeInMillis, now.timeInMillis)

        // Locale-dependent formatting; assert on shape rather than exact text.
        assert(today.contains("7")) { "expected a time, got $today" }
        assert(thisYear.contains("8") && thisYear.length <= 8) { "expected 'd MMM', got $thisYear" }
    }
}
