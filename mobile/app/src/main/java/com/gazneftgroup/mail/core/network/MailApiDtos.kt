package com.gazneftgroup.mail.core.network

import kotlinx.serialization.Serializable

/**
 * Wire types for the Gazneft IMAP/SMTP proxy (server.ts / netlify functions).
 * Field names must stay in lockstep with the Express handlers.
 */

@Serializable
data class ImapConfigDto(
    val host: String,
    val port: Int,
    val user: String,
    val pass: String? = null,
)

@Serializable
data class SmtpConfigDto(
    val host: String,
    val port: Int,
    val user: String,
    val pass: String? = null,
)

@Serializable
data class FetchEmailsRequest(
    val imapConfig: ImapConfigDto,
    val folder: String = "INBOX",
    val limit: Int = 20,
    val authType: String? = null,        // "password" | "oauth2"
    val accessToken: String? = null,
    val refreshToken: String? = null,
)

@Serializable
data class MessageEnvelopeDto(
    val uid: Long,
    val seq: Long? = null,
    val subject: String = "(No Subject)",
    val from: String = "(Unknown Sender)",
    val to: String? = null,
    val date: String,
    val snippet: String = "",
    val body: String = "",
    val isRead: Boolean = false,
)

@Serializable
data class FetchEmailsResponse(
    val success: Boolean = false,
    val messages: List<MessageEnvelopeDto> = emptyList(),
    val error: String? = null,
)

@Serializable
data class FetchMessageBodyRequest(
    val imapConfig: ImapConfigDto,
    val uid: Long,
    val folder: String = "INBOX",
    val authType: String? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null,
)

@Serializable
data class AttachmentDto(
    val filename: String,
    val contentType: String,
    val size: Long,
    val contentId: String? = null,
    val url: String? = null,             // data: URI from the proxy
)

@Serializable
data class FetchMessageBodyResponse(
    val success: Boolean = false,
    val snippet: String = "",
    val body: String = "",
    val attachments: List<AttachmentDto> = emptyList(),
    val error: String? = null,
)

@Serializable
data class UpdateFlagsRequest(
    val imapConfig: ImapConfigDto,
    val uid: Long,
    val flags: List<String>,             // e.g. ["\\Seen"]
    val action: String,                  // "add" | "remove" | "set"
    val folder: String = "INBOX",
    val authType: String? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null,
)

@Serializable
data class MailOptionsDto(
    val from: String,
    val to: String,
    val subject: String,
    val html: String,
    val replyTo: String? = null,
)

@Serializable
data class SendEmailRequest(
    val smtpConfig: SmtpConfigDto,
    val mailOptions: MailOptionsDto,
    val authType: String? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null,
)

@Serializable
data class SendEmailResponse(
    val success: Boolean = false,
    val messageId: String? = null,
    val error: String? = null,
)

@Serializable
data class SimpleSuccessResponse(
    val success: Boolean = false,
    val error: String? = null,
)
