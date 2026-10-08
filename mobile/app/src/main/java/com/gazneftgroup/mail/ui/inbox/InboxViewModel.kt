package com.gazneftgroup.mail.ui.inbox

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.gazneftgroup.mail.data.account.AccountRepository
import com.gazneftgroup.mail.data.message.MessageRepository
import com.gazneftgroup.mail.domain.model.EmailAccount
import com.gazneftgroup.mail.domain.model.EmailMessage
import com.gazneftgroup.mail.domain.model.MailFolder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class InboxViewModel @Inject constructor(
    private val accountRepository: AccountRepository,
    private val messageRepository: MessageRepository,
) : ViewModel() {

    private val selectedAccountId = MutableStateFlow<String?>(null)
    private val selectedFolder = MutableStateFlow(MailFolder.INBOX)

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
                null to MailFolder.INBOX,
            )

    /** Paged messages for the current (account, folder); Room-backed, offline-first. */
    val messages = selection
        .flatMapLatest { (accountId, folder) ->
            if (accountId == null) emptyFlow()
            else messageRepository.pagedMessages(accountId, folder)
        }
        .cachedIn(viewModelScope) // survives rotation without refetching

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
}
