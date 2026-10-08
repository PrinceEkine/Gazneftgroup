package com.gazneftgroup.mail.di

import android.content.Context
import androidx.room.Room
import com.gazneftgroup.mail.core.db.AppDatabase
import com.gazneftgroup.mail.core.db.MessageDao
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
            .fallbackToDestructiveMigration() // cache-only DB: safe to rebuild from server
            .build()

    @Provides
    fun provideMessageDao(db: AppDatabase): MessageDao = db.messageDao()

    @Provides
    fun provideSyncStateDao(db: AppDatabase): SyncStateDao = db.syncStateDao()
}
