package com.gazneftgroup.mail.core.db

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Queued outgoing mail: sends that failed (usually offline) wait here until
 * they go out. Unlike [MessageEntity] this is user data, not rebuildable
 * cache — it must survive database migrations (see the v1→v2 migration).
 */
@Entity(
    tableName = "outbox",
    indices = [Index(value = ["accountId", "createdAt"])],
)
data class OutboxEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val accountId: String,
    val to: String,
    val subject: String,
    val body: String,              // HTML, as handed to the proxy
    val createdAt: Long,           // epoch millis
    val lastError: String? = null, // why the last attempt failed, if any
    val attempts: Int = 0,
)

@Dao
interface OutboxDao {

    @Query("SELECT * FROM outbox WHERE accountId = :accountId ORDER BY createdAt ASC")
    fun observeForAccount(accountId: String): Flow<List<OutboxEntity>>

    @Query("SELECT * FROM outbox ORDER BY createdAt ASC")
    suspend fun all(): List<OutboxEntity>

    @Query("SELECT COUNT(*) FROM outbox WHERE accountId = :accountId")
    fun observeCount(accountId: String): Flow<Int>

    @Insert
    suspend fun insert(entry: OutboxEntity): Long

    @Query("DELETE FROM outbox WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("UPDATE outbox SET lastError = :error, attempts = attempts + 1 WHERE id = :id")
    suspend fun recordFailure(id: Long, error: String)
}
