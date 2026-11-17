package com.gazneftgroup.mail.core.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [MessageEntity::class, SyncStateEntity::class, OutboxEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun messageDao(): MessageDao
    abstract fun syncStateDao(): SyncStateDao
    abstract fun outboxDao(): OutboxDao

    companion object {
        /**
         * v1→v2 adds the outbox queue. The outbox holds unsent user mail, so
         * it gets a real migration — it must never be wiped by the
         * destructive fallback that covers the rebuildable message cache.
         */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `outbox` (" +
                        "`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                        "`accountId` TEXT NOT NULL, " +
                        "`to` TEXT NOT NULL, " +
                        "`subject` TEXT NOT NULL, " +
                        "`body` TEXT NOT NULL, " +
                        "`createdAt` INTEGER NOT NULL, " +
                        "`lastError` TEXT, " +
                        "`attempts` INTEGER NOT NULL)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_outbox_accountId_createdAt` " +
                        "ON `outbox` (`accountId`, `createdAt`)"
                )
            }
        }
    }
}
