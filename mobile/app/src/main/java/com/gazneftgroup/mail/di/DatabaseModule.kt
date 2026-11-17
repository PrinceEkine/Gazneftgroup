package com.gazneftgroup.mail.di

import android.content.Context
import androidx.room.Room
import com.gazneftgroup.mail.core.db.AppDatabase
import com.gazneftgroup.mail.core.db.MessageDao
import com.gazneftgroup.mail.core.db.OutboxDao
import com.gazneftgroup.mail.core.db.SyncStateDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "gnmail.db")
            // Messages are rebuildable cache, but the outbox is unsent user
            // mail: it always ships an explicit migration (MIGRATION_1_2) so
            // the destructive fallback below never wipes it.
            .addMigrations(AppDatabase.MIGRATION_1_2)
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideMessageDao(db: AppDatabase): MessageDao = db.messageDao()

    @Provides
    fun provideOutboxDao(db: AppDatabase): OutboxDao = db.outboxDao()

    @Provides
    fun provideSyncStateDao(db: AppDatabase): SyncStateDao = db.syncStateDao()
}
