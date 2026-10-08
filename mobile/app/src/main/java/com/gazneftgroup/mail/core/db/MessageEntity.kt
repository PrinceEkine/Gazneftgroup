package com.gazneftgroup.mail.core.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.gazneftgroup.mail.domain.model.EmailMessage
import com.gazneftgroup.mail.domain.model.MailFolder

/**
 * Cached email message. Room is the single source of truth for the UI: the
 * network only ever writes into this table, and screens only ever read from
 * it. That keeps the app fully usable offline and turns the backend into a
 * sync target instead of a hot path.
 */
@Entity(
    tableName = "messages",
    indices = [
        Index(value = ["accountId", "folder", "date"]),
        Index(value = ["accountId", "folder", "uid"], unique = true),
    ],
)
data class MessageEntity(
    @PrimaryKey val id: String,          // "$accountId:$folder:$uid"
    val uid: Long,
    val accountId: String,
    val folder: String,
    val subject: String,
    val fromAddress: String,
    val toAddress: String,
    val date: Long,
    val snippet: String,
    val body: String,
    val isRead: Boolean,
    val hasAttachments: Boolean,
    val bodyFetched: Boolean,            // envelope-only rows fetch body on open
)

fun MessageEntity.toDomain() = EmailMessage(
    id = id,
    uid = uid,
    accountId = accountId,
    subject = subject,
    from = fromAddress,
    to = toAddress,
    date = date,
    snippet = snippet,
    body = body,
    isRead = isRead,
    folder = MailFolder.fromWire(folder),
    hasAttachments = hasAttachments,
)
