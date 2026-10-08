package com.gazneftgroup.mail.domain.model

/**
 * Domain models. Mirror the canonical schema in firebase-blueprint.json and
 * src/types.ts on the web side so all clients agree on shape.
 */

enum class MailFolder(val wireName: String) {
    INBOX("INBOX"),
    SENT("Sent"),
    DRAFTS("Drafts"),
    TRASH("Trash"),
    SPAM("Spam");

    companion object {
        fun fromWire(value: String): MailFolder =
            entries.firstOrNull { it.wireName.equals(value, ignoreCase = true) } ?: INBOX
    }
}

enum class AuthType { PASSWORD, OAUTH2 }

data class EmailAccount(
    val id: String,
    val ownerUid: String,
    val email: String,
    val provider: String,          // gmail | outlook | custom
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

data class UserProfile(
    val uid: String,
    val email: String,
    val displayName: String? = null,
    val photoUrl: String? = null,
)
