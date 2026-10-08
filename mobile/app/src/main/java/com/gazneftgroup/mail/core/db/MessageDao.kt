package com.gazneftgroup.mail.core.db

import androidx.paging.PagingSource
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {

    @Query("SELECT * FROM messages WHERE accountId = :accountId AND folder = :folder ORDER BY date DESC")
    fun pagingSource(accountId: String, folder: String): PagingSource<Int, MessageEntity>

    @Query("SELECT * FROM messages WHERE id = :id")
    fun observeMessage(id: String): Flow<MessageEntity?>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnoring(messages: List<MessageEntity>)

    /**
     * Upsert that preserves locally-known state (fetched bodies, read flags
     * changed optimistically) when re-syncing envelope-only data.
     */
    @Transaction
    suspend fun upsertEnvelopes(messages: List<MessageEntity>) {
        insertIgnoring(messages)
        messages.forEach { updateEnvelope(it.id, it.subject, it.fromAddress, it.toAddress, it.date, it.isRead) }
    }

    @Query(
        """UPDATE messages SET subject = :subject, fromAddress = :from, toAddress = :to,
           date = :date, isRead = :isRead WHERE id = :id AND bodyFetched = 0"""
    )
    suspend fun updateEnvelope(id: String, subject: String, from: String, to: String, date: Long, isRead: Boolean)

    @Query("UPDATE messages SET body = :body, snippet = :snippet, hasAttachments = :hasAttachments, bodyFetched = 1 WHERE id = :id")
    suspend fun updateBody(id: String, body: String, snippet: String, hasAttachments: Boolean)

    @Query("UPDATE messages SET isRead = :isRead WHERE id = :id")
    suspend fun updateReadState(id: String, isRead: Boolean)

    @Query("DELETE FROM messages WHERE accountId = :accountId AND folder = :folder")
    suspend fun clearFolder(accountId: String, folder: String)

    @Query("DELETE FROM messages WHERE accountId = :accountId")
    suspend fun clearAccount(accountId: String)

    @Query("SELECT COUNT(*) FROM messages WHERE accountId = :accountId AND folder = :folder AND isRead = 0")
    fun observeUnreadCount(accountId: String, folder: String): Flow<Int>
}
