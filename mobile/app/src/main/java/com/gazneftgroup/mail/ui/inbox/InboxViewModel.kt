package com.gazneftgroup.mail.ui.inbox

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.gazneftgroup.mail.core.common.onSuccess
import com.gazneftgroup.mail.data.account.AccountRepository
import com.gazneftgroup.mail.data.folder.FolderRepository
import com.gazneftgroup.mail.data.message.MessageRepository
import com.gazneftgroup.mail.domain.model.EmailAccount
import com.gazneftgroup.mail.domain.model.EmailMessage
import com.gazneftgroup.mail.domain.model.MailFolder
import com.gazneftgroup.mail.domain.model.QueuedEmail
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class InboxViewModel @Inject constructor(
    private val accountRepository: AccountRepository,
    private val messageRepository: MessageRepository,
    private val folderRepository: FolderRepository,
) : ViewModel() {

    private val selectedAccountId = MutableStateFlow<String?>(null)
    private val selectedFolder = MutableStateFlow<MailFolder>(MailFolder.Inbox)

    /** Loaded (non-standard) folders for the selected account. */
    private val extraFolders = MutableStateFlow<List<MailFolder>>(emptyList())
    val moreFolders: StateFlow<List<MailFolder>> = extraFolders
        .map { MailFolder.moreStandard + it }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MailFolder.moreStandard)

    val accounts: StateFlow<List<EmailAccount>> = accountRepository.observeAccounts()
        .catch { emit(emptyList()) }
        .onEach { list ->
            // Default to the first linked account once accounts arrive.
            if (selectedAccountId.value == null && list.isNotEmpty()) {
                selectedAccountId.value = list.first().id
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val selection: StateFlow<Pair<String?, MailFolder>> =
        combine(selectedAccountId, selectedFolder) { id, folder -> id to folder }
            .stateIn(
                viewModelScope,
                SharingStarted.WhileSubscribed(5_000),
                null to MailFolder.Inbox,
            )

    /**
     * Paged messages for the current (account, folder); Room-backed,
     * offline-first. Outbox is local-only so it emits no pages — the
     * drawer content switches to [outbox] instead.
     */
    val messages: Flow<PagingData<EmailMessage>> = selection
        .flatMapLatest { (accountId, folder) ->
            if (accountId == null || folder is MailFolder.Outbox) emptyFlow()
            else messageRepository.pagedMessages(accountId, folder)
        }
        .cachedIn(viewModelScope) // survives rotation without refetching

    /** Queued outbox mail for the selected account. */
    val outbox: StateFlow<List<QueuedEmail>> = selectedAccountId
        .flatMapLatest { id ->
            if (id == null) flowOf(emptyList())
            else messageRepository.observeOutbox(id)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val outboxCount: StateFlow<Int> = selectedAccountId
        .flatMapLatest { id ->
            if (id == null) flowOf(0)
            else messageRepository.observeOutboxCount(id)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    val inboxUnread: StateFlow<Int> = selectedAccountId
        .flatMapLatest { id ->
            if (id == null) flowOf(0)
            else messageRepository.observeUnreadCount(id, MailFolder.Inbox)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    init {
        // Refresh the loaded folder list whenever the account changes. A
        // failed LIST still leaves the standard folders working, so errors
        // stay silent here — folders reload on the next account switch.
        viewModelScope.launch {
            selectedAccountId.filterNotNull().collect { accountId ->
                extraFolders.value = emptyList()
                folderRepository.listExtraFolders(accountId)
                    .onSuccess { extraFolders.value = it }
            }
        }
    }

    fun selectAccount(accountId: String) {
        selectedAccountId.value = accountId
    }

    fun selectFolder(folder: MailFolder) {
        selectedFolder.value = folder
    }

    fun markRead(message: EmailMessage) {
        if (message.isRead) return
        viewModelScope.launch { messageRepository.setRead(message, isRead = true) }
    }

    fun retryQueued(id: Long) {
        viewModelScope.launch { messageRepository.retryQueued(id) }
    }

    fun deleteQueued(id: Long) {
        viewModelScope.launch { messageRepository.deleteQueued(id) }
    }
}
