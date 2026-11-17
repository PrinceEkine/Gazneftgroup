package com.gazneftgroup.mail.domain.model

/**
 * Domain models. Mirror the canonical schema in firebase-blueprint.json and
 * src/types.ts on the web side so all clients agree on shape.
 */

/**
 * Gmail-style folders. The standard folders use the wire names the proxy
 * resolves per provider (openMailboxWithFallback fuzzy-matches e.g. "Sent"
 * to "[Gmail]/Sent Mail"); Custom carries a raw IMAP path from the
 * account's LIST response. Outbox is local-only and is never sent to the
 * proxy — its wireName only exists so it can sit in the same lists.
 */
sealed interface MailFolder {
    /** Label shown in the drawer. */
    val label: String
    /** IMAP path for proxy calls and the Room cache key. */
    val wireName: String

    data object Inbox : MailFolder {
        override val label = "Inbox"
        override val wireName = "INBOX"
    }
    data object Outbox : MailFolder {
        override val label = "Outbox"
        override val wireName = "OUTBOX"
    }
    data object Sent : MailFolder {
        override val label = "Sent"
        override val wireName = "Sent"
    }
    data object Drafts : MailFolder {
        override val label = "Drafts"
        override val wireName = "Drafts"
    }
    data object Trash : MailFolder {
        override val label = "Trash"
        override val wireName = "Trash"
    }
    data object Spam : MailFolder {
        override val label = "Spam"
        override val wireName = "Spam"
    }
    data class Custom(val path: String) : MailFolder {
        override val label: String =
            path.split('/', '.').lastOrNull { it.isNotEmpty() } ?: path
        override val wireName: String = path
    }

    companion object {
        /** Drawer order above "More". */
        val main: List<MailFolder> = listOf(Inbox, Outbox, Sent, Drafts)
        /** Standard folders that live under "More", above loaded folders. */
        val moreStandard: List<MailFolder> = listOf(Trash, Spam)

        /** Provider paths that mean a standard folder (aliases of wire names). */
        private val standardByPath: Map<String, MailFolder> = buildMap {
            fun put(folder: MailFolder, vararg paths: String) {
                paths.forEach { this[it.lowercase()] = folder }
            }
            put(Inbox, "INBOX", "Inbox")
            put(Outbox, "OUTBOX")
            put(Sent, "Sent", "Sent Items", "Sent Mail", "[Gmail]/Sent Mail")
            put(Drafts, "Drafts", "[Gmail]/Drafts")
            put(Trash, "Trash", "Deleted", "Deleted Items", "[Gmail]/Trash")
            put(Spam, "Spam", "Junk", "Junk Email", "[Gmail]/Spam")
        }

        /** Rebuild a folder from its Room/proxy wire name; unknown paths stay Custom. */
        fun fromWire(value: String): MailFolder =
            standardByPath[value.lowercase()] ?: Custom(value)

        /**
         * Classify a LISTed mailbox: standard folder, or Custom for genuine
         * extra folders. Special-use flags (RFC 6154) win; otherwise the
         * path is matched against known standard paths.
         */
        fun fromListed(path: String, specialUse: String?): MailFolder {
            when (specialUse?.lowercase()) {
                "\\sent" -> return Sent
                "\\drafts" -> return Drafts
                "\\trash" -> return Trash
                "\\junk" -> return Spam
                "\\inbox" -> return Inbox
            }
            return fromWire(path)
        }
    }
}

enum class AuthType { PASSWORD, OAUTH2 }

data class EmailAccount(
    val id: String,
    val ownerUid: String,
    val email: String,
    val provider: String,          // gmail | outlook | gnmail | custom
    val imapHost: String,
    val imapPort: Int,
    val smtpHost: String,
    val smtpPort: Int,
    val label: String,
    val color: String,
    val authType: AuthType,
    val lastSynced: Long? = null,
)

data class EmailMessage(
    val id: String,                // stable id: "$accountId:$folder:$uid"
    val uid: Long,                 // IMAP UID within the folder
    val accountId: String,
    val subject: String,
    val from: String,
    val to: String,
    val date: Long,                // epoch millis — sortable, timezone-safe
    val snippet: String,
    val body: String,
    val isRead: Boolean,
    val folder: MailFolder,
    val hasAttachments: Boolean,
)

data class OutgoingEmail(
    val accountId: String,
    val to: String,
    val subject: String,
    val body: String,
    val replyTo: String? = null,
)

/** One unsent message waiting in the Outbox queue. */
data class QueuedEmail(
    val id: Long,
    val accountId: String,
    val to: String,
    val subject: String,
    val body: String,
    val createdAt: Long,
    val lastError: String?,
    val attempts: Int,
)

data class UserProfile(
    val uid: String,
    val email: String,
    val displayName: String? = null,
    val photoUrl: String? = null,
)
