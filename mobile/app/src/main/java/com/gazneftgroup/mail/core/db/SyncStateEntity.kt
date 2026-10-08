package com.gazneftgroup.mail.core.db

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

/**
 * Per-(account, folder) sync bookkeeping for the RemoteMediator: how deep the
 * cache goes and when it was last refreshed, so we can rate-limit refreshes
 * (client-side throttling is the first line of defense for the backend).
 */
@Entity(tableName = "sync_state", primaryKeys = ["accountId", "folder"])
data class SyncStateEntity(
    val accountId: String,
    val folder: String,
    val fetchedCount: Int,
    val endReached: Boolean,
    val lastRefreshedAt: Long,
)

@Dao
interface SyncStateDao {
    @Query("SELECT * FROM sync_state WHERE accountId = :accountId AND folder = :folder")
    suspend fun get(accountId: String, folder: String): SyncStateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(state: SyncStateEntity)

    @Query("DELETE FROM sync_state WHERE accountId = :accountId AND folder = :folder")
    suspend fun clear(accountId: String, folder: String)
}
