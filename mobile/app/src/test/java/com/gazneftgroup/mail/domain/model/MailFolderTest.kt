package com.gazneftgroup.mail.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MailFolderTest {

    @Test
    fun `fromWire maps standard paths`() {
        assertEquals(MailFolder.Inbox, MailFolder.fromWire("INBOX"))
        assertEquals(MailFolder.Sent, MailFolder.fromWire("Sent"))
        assertEquals(MailFolder.Drafts, MailFolder.fromWire("Drafts"))
        assertEquals(MailFolder.Trash, MailFolder.fromWire("Trash"))
        assertEquals(MailFolder.Spam, MailFolder.fromWire("Spam"))
    }

    @Test
    fun `fromWire maps provider aliases`() {
        assertEquals(MailFolder.Sent, MailFolder.fromWire("[Gmail]/Sent Mail"))
        assertEquals(MailFolder.Drafts, MailFolder.fromWire("[Gmail]/Drafts"))
        assertEquals(MailFolder.Trash, MailFolder.fromWire("Deleted"))
        assertEquals(MailFolder.Spam, MailFolder.fromWire("Junk"))
        assertEquals(MailFolder.Sent, MailFolder.fromWire("sent"))
    }

    @Test
    fun `fromWire keeps unknown paths as custom`() {
        val folder = MailFolder.fromWire("[Gmail]/All Mail")
        assertTrue(folder is MailFolder.Custom)
        assertEquals("[Gmail]/All Mail", (folder as MailFolder.Custom).path)
        assertEquals("All Mail", folder.label)
        assertEquals("[Gmail]/All Mail", folder.wireName)
    }

    @Test
    fun `custom label is the last path segment`() {
        assertEquals("Receipts", MailFolder.Custom("Receipts").label)
        assertEquals("2024", MailFolder.Custom("Archive/2024").label)
        assertEquals("c", MailFolder.Custom("a.b.c").label)
    }

    @Test
    fun `fromListed prefers special-use flags`() {
        assertEquals(MailFolder.Sent, MailFolder.fromListed("Anything", "\\Sent"))
        assertEquals(MailFolder.Drafts, MailFolder.fromListed("Anything", "\\Drafts"))
        assertEquals(MailFolder.Trash, MailFolder.fromListed("Anything", "\\Trash"))
        assertEquals(MailFolder.Spam, MailFolder.fromListed("Anything", "\\Junk"))
        assertEquals(MailFolder.Inbox, MailFolder.fromListed("Anything", "\\Inbox"))
    }

    @Test
    fun `fromListed falls back to path matching`() {
        assertEquals(MailFolder.Inbox, MailFolder.fromListed("INBOX", null))
        assertEquals(MailFolder.Sent, MailFolder.fromListed("[Gmail]/Sent Mail", null))
        val custom = MailFolder.fromListed("Projects", null)
        assertTrue(custom is MailFolder.Custom)
    }

    @Test
    fun `drawer order matches Gmail`() {
        assertEquals(
            listOf(MailFolder.Inbox, MailFolder.Outbox, MailFolder.Sent, MailFolder.Drafts),
            MailFolder.main,
        )
        assertEquals(listOf(MailFolder.Trash, MailFolder.Spam), MailFolder.moreStandard)
    }
}
