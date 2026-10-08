package com.gazneftgroup.mail.ui.inbox

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Attachment
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.gazneftgroup.mail.domain.model.EmailAccount
import com.gazneftgroup.mail.domain.model.EmailMessage
import com.gazneftgroup.mail.domain.model.MailFolder
import com.gazneftgroup.mail.ui.components.BrandMark
import com.gazneftgroup.mail.ui.components.EmptyState
import com.gazneftgroup.mail.ui.theme.BrandColors
import com.gazneftgroup.mail.ui.util.MailFormat

/**
 * Inbox. The app bar carries the folder name as the title and the active
 * mailbox underneath; tapping it switches accounts. Folders are text tabs with
 * a hairline indicator. The list is avatar + two lines + snippet, with inset
 * dividers, and the only colour on screen is the unread marker and the FAB.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    onOpenMessage: (String) -> Unit,
    onCompose: (accountId: String) -> Unit,
    onSignOut: () -> Unit,
    viewModel: InboxViewModel = hiltViewModel(),
) {
    val accounts by viewModel.accounts.collectAsState()
    val selection by viewModel.selection.collectAsState()
    val messages = viewModel.messages.collectAsLazyPagingItems()
    val (selectedAccountId, selectedFolder) = selection
    val selectedAccount = accounts.firstOrNull { it.id == selectedAccountId }

    val listState = rememberLazyListState()
    val fabExpanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    var menuOpen by remember { mutableStateOf(false) }
    var accountMenuOpen by remember { mutableStateOf(false) }

    val isRefreshing = messages.loadState.refresh is LoadState.Loading && messages.itemCount > 0

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            Column(modifier = Modifier.background(MaterialTheme.colorScheme.surface)) {
                TopAppBar(
                    title = {
                        Column(
                            modifier = Modifier
                                .clickable(enabled = accounts.size > 1) { accountMenuOpen = true }
                                .padding(end = 8.dp),
                        ) {
                            Text(
                                text = folderLabel(selectedFolder),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            if (selectedAccount != null) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = selectedAccount.email,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    if (accounts.size > 1) {
                                        Icon(
                                            Icons.Outlined.ExpandMore,
                                            contentDescription = "Switch mailbox",
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(16.dp),
                                        )
                                    }
                                }
                            }
                            AccountMenu(
                                expanded = accountMenuOpen,
                                accounts = accounts,
                                selectedId = selectedAccountId,
                                onDismiss = { accountMenuOpen = false },
                                onSelect = {
                                    accountMenuOpen = false
                                    viewModel.selectAccount(it)
                                },
                            )
                        }
                    },
                    navigationIcon = {
                        Box(modifier = Modifier.padding(start = 16.dp, end = 4.dp)) { BrandMark(size = 32.dp) }
                    },
                    actions = {
                        Box {
                            IconButton(onClick = { menuOpen = true }) {
                                Icon(Icons.Outlined.MoreVert, contentDescription = "More")
                            }
                            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                                DropdownMenuItem(
                                    text = { Text("Refresh") },
                                    onClick = {
                                        menuOpen = false
                                        messages.refresh()
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text("Sign out") },
                                    leadingIcon = {
                                        Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null)
                                    },
                                    onClick = {
                                        menuOpen = false
                                        onSignOut()
                                    },
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        scrolledContainerColor = MaterialTheme.colorScheme.surface,
                    ),
                    scrollBehavior = scrollBehavior,
                )
                if (accounts.isNotEmpty()) {
                    FolderTabs(selected = selectedFolder, onSelect = viewModel::selectFolder)
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            }
        },
        floatingActionButton = {
            selectedAccountId?.let { accountId ->
                ExtendedFloatingActionButton(
                    onClick = { onCompose(accountId) },
                    expanded = fabExpanded,
                    icon = { Icon(Icons.Outlined.Edit, contentDescription = null) },
                    text = { Text("Compose") },
                    shape = RoundedCornerShape(16.dp),
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                )
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (accounts.isEmpty()) {
                EmptyState(
                    icon = Icons.Outlined.MailOutline,
                    title = "No mailbox linked",
                    body = "Link a Gmail, Outlook or IMAP mailbox from the GNmail web app. It will appear here.",
                )
                return@Box
            }

            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { messages.refresh() },
                modifier = Modifier.fillMaxSize(),
            ) {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 104.dp),
                ) {
                    items(
                        count = messages.itemCount,
                        key = messages.itemKey { it.id },
                    ) { index ->
                        messages[index]?.let { message ->
                            MessageRow(
                                message = message,
                                accountColor = if (accounts.size > 1) selectedAccount?.let { parseAccountColor(it.color) } else null,
                                onClick = {
                                    viewModel.markRead(message)
                                    onOpenMessage(message.id)
                                },
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        }
                    }

                    val refresh = messages.loadState.refresh
                    val append = messages.loadState.append
                    when {
                        refresh is LoadState.Loading && messages.itemCount == 0 ->
                            item { LoadingRow() }

                        refresh is LoadState.Error && messages.itemCount == 0 -> item {
                            EmptyState(
                                icon = Icons.Outlined.CloudOff,
                                title = "Can't reach the mail server",
                                body = "Check your connection and try again.",
                                action = {
                                    OutlinedButton(onClick = { messages.retry() }) { Text("Retry") }
                                },
                            )
                        }

                        refresh is LoadState.NotLoading && messages.itemCount == 0 &&
                            append.endOfPaginationReached -> item {
                            EmptyState(
                                icon = Icons.Outlined.Inbox,
                                title = "No messages",
                                body = "New mail will appear here.",
                            )
                        }

                        append is LoadState.Loading -> item { LoadingRow() }

                        append is LoadState.Error -> item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                OutlinedButton(onClick = { messages.retry() }) { Text("Load more") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountMenu(
    expanded: Boolean,
    accounts: List<EmailAccount>,
    selectedId: String?,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit,
) {
    DropdownMenu(expanded = expanded, onDismissRequest = onDismiss) {
        accounts.forEach { account ->
            DropdownMenuItem(
                text = {
                    Column {
                        Text(
                            account.label.ifBlank { account.email },
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (account.id == selectedId) FontWeight.SemiBold else FontWeight.Normal,
                        )
                        if (account.label.isNotBlank() && account.label != account.email) {
                            Text(
                                account.email,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                leadingIcon = {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(parseAccountColor(account.color), CircleShape),
                    )
                },
                onClick = { onSelect(account.id) },
            )
        }
    }
}

/** Text tabs with a 2dp hairline under the active one. No chips, no icons. */
@Composable
private fun FolderTabs(selected: MailFolder, onSelect: (MailFolder) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 8.dp),
    ) {
        MailFolder.entries.forEach { folder ->
            val active = folder == selected
            val color by animateColorAsState(
                targetValue = if (active) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                label = "tabColor",
            )
            Column(
                modifier = Modifier
                    .clickable { onSelect(folder) }
                    .padding(horizontal = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = folderLabel(folder),
                    style = MaterialTheme.typography.labelLarge,
                    color = color,
                    modifier = Modifier.padding(top = 10.dp, bottom = 10.dp),
                )
                Box(
                    modifier = Modifier
                        .width(24.dp)
                        .height(2.dp)
                        .background(
                            if (active) MaterialTheme.colorScheme.primary else Color.Transparent,
                            RoundedCornerShape(1.dp),
                        ),
                )
            }
        }
    }
}

@Composable
private fun MessageRow(message: EmailMessage, accountColor: Color?, onClick: () -> Unit) {
    val unread = !message.isRead
    val ink = MaterialTheme.colorScheme.onSurface
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val blue = MaterialTheme.colorScheme.primary
    // web: `!isRead && "bg-blue-50/50 dark:bg-slate-800/20"`
    val rowBg = if (unread) blue.copy(alpha = 0.05f) else Color.Transparent

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(rowBg)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (unread) {
                // web: `w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]`
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .background(blue.copy(alpha = 0.25f), CircleShape)
                        .padding(4.dp)
                        .background(blue, CircleShape),
                )
                Spacer(Modifier.width(8.dp))
            }
            Text(
                text = MailFormat.displayName(message.from),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (unread) FontWeight.Bold else FontWeight.Medium,
                color = if (unread) ink else muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = MailFormat.listDate(message.date),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = if (unread) FontWeight.Bold else FontWeight.Normal,
                color = if (unread) blue else muted,
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 3.dp)) {
            Text(
                text = message.subject.ifBlank { "(no subject)" },
                style = MaterialTheme.typography.bodySmall,
                fontWeight = if (unread) FontWeight.SemiBold else FontWeight.Normal,
                color = if (unread) ink else muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            if (message.hasAttachments) {
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Outlined.Attachment, contentDescription = "Has attachments", tint = muted, modifier = Modifier.size(12.dp))
            }
            if (accountColor != null) {
                Spacer(Modifier.width(8.dp))
                Box(modifier = Modifier.size(6.dp).background(accountColor, CircleShape))
            }
        }
        if (message.snippet.isNotBlank()) {
            Text(
                text = message.snippet,
                style = MaterialTheme.typography.bodySmall,
                color = muted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 18.sp,
                modifier = Modifier.padding(top = 3.dp),
            )
        }
    }
}

@Composable
private fun LoadingRow() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(22.dp),
            strokeWidth = 2.dp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun folderLabel(folder: MailFolder): String = when (folder) {
    MailFolder.INBOX -> "Inbox"
    MailFolder.SENT -> "Sent"
    MailFolder.DRAFTS -> "Drafts"
    MailFolder.TRASH -> "Trash"
    MailFolder.SPAM -> "Spam"
}

private fun parseAccountColor(hex: String): Color = runCatching {
    Color(android.graphics.Color.parseColor(hex.trim()))
}.getOrDefault(BrandColors.Sky)
