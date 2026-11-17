package com.gazneftgroup.mail.ui.inbox

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Attachment
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Drafts
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.Outbox
import androidx.compose.material.icons.outlined.Report
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import com.gazneftgroup.mail.domain.model.QueuedEmail
import com.gazneftgroup.mail.ui.components.BrandMark
import com.gazneftgroup.mail.ui.components.EmptyState
import com.gazneftgroup.mail.ui.components.SenderAvatar
import com.gazneftgroup.mail.ui.components.ShimmerInboxRow
import com.gazneftgroup.mail.ui.theme.BrandColors
import com.gazneftgroup.mail.ui.util.MailFormat
import kotlinx.coroutines.launch

/**
 * Gmail-style mail screen. A navigation drawer holds the folders — Inbox,
 * Outbox, Sent, Drafts, then Trash, Spam and the account's loaded folders
 * under "More". The app bar carries the folder name as the title and the
 * active mailbox underneath; tapping it switches accounts. The list is
 * avatar + two lines + snippet, with inset dividers, and the only colour
 * on screen is the unread marker and the FAB.
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
    val moreFolders by viewModel.moreFolders.collectAsState()
    val outbox by viewModel.outbox.collectAsState()
    val outboxCount by viewModel.outboxCount.collectAsState()
    val inboxUnread by viewModel.inboxUnread.collectAsState()
    val (selectedAccountId, selectedFolder) = selection
    val selectedAccount = accounts.firstOrNull { it.id == selectedAccountId }

    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var moreOpen by remember { mutableStateOf(true) }
    val closeDrawer = { scope.launch { drawerState.close() } }

    val listState = rememberLazyListState()
    val fabExpanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    var menuOpen by remember { mutableStateOf(false) }
    var accountMenuOpen by remember { mutableStateOf(false) }

    val isRefreshing = messages.loadState.refresh is LoadState.Loading && messages.itemCount > 0
    val isOutbox = selectedFolder is MailFolder.Outbox

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                DrawerHeader(account = selectedAccount)
                MailFolder.main.forEach { folder ->
                    val badge = when (folder) {
                        is MailFolder.Inbox -> inboxUnread
                        is MailFolder.Outbox -> outboxCount
                        else -> 0
                    }
                    NavigationDrawerItem(
                        label = { Text(folder.label) },
                        selected = folder == selectedFolder,
                        icon = { Icon(folderIcon(folder), contentDescription = null) },
                        badge = {
                            if (badge > 0) {
                                Text(
                                    text = if (badge > 99) "99+" else badge.toString(),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        },
                        onClick = {
                            viewModel.selectFolder(folder)
                            closeDrawer()
                        },
                    )
                }
                NavigationDrawerItem(
                    label = { Text(if (moreOpen) "Less" else "More") },
                    selected = false,
                    icon = {
                        Icon(
                            if (moreOpen) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore,
                            contentDescription = null,
                        )
                    },
                    onClick = { moreOpen = !moreOpen },
                )
                if (moreOpen) {
                    moreFolders.forEach { folder ->
                        NavigationDrawerItem(
                            label = { Text(folder.label) },
                            selected = folder == selectedFolder,
                            icon = { Icon(folderIcon(folder), contentDescription = null) },
                            onClick = {
                                viewModel.selectFolder(folder)
                                closeDrawer()
                            },
                        )
                    }
                }
            }
        },
    ) {
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
                                    text = selectedFolder.label,
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
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(Icons.Outlined.Menu, contentDescription = "Folders")
                            }
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

                if (isOutbox) {
                    OutboxContent(
                        queued = outbox,
                        onRetry = viewModel::retryQueued,
                        onDelete = viewModel::deleteQueued,
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
                                // animateItem glides rows when the list reorders
                                // (new mail, read-state changes) instead of jumping.
                                Column(modifier = Modifier.animateItem()) {
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
                        }

                        val refresh = messages.loadState.refresh
                        val append = messages.loadState.append
                        when {
                            refresh is LoadState.Loading && messages.itemCount == 0 ->
                                items(8) { ShimmerInboxRow() }

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
}

private fun folderIcon(folder: MailFolder): ImageVector = when (folder) {
    is MailFolder.Inbox -> Icons.Outlined.Inbox
    is MailFolder.Outbox -> Icons.Outlined.Outbox
    is MailFolder.Sent -> Icons.AutoMirrored.Outlined.Send
    is MailFolder.Drafts -> Icons.Outlined.Drafts
    is MailFolder.Trash -> Icons.Outlined.Delete
    is MailFolder.Spam -> Icons.Outlined.Report
    is MailFolder.Custom -> Icons.Outlined.Folder
}

@Composable
private fun DrawerHeader(account: EmailAccount?) {
    Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 20.dp)) {
        BrandMark(size = 40.dp)
        Spacer(Modifier.height(12.dp))
        Text(
            text = "GNmail",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )
        if (account != null) {
            Text(
                text = account.email,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
    HorizontalDivider(modifier = Modifier.padding(bottom = 8.dp))
}

/** Queued unsent mail with per-row retry and delete. Deletion is confirmed. */
@Composable
private fun OutboxContent(
    queued: List<QueuedEmail>,
    onRetry: (Long) -> Unit,
    onDelete: (Long) -> Unit,
) {
    var pendingDelete by remember { mutableStateOf<QueuedEmail?>(null) }

    pendingDelete?.let { entry ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete queued message?") },
            text = { Text("This message has not been sent. It cannot be recovered.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete(entry.id)
                        pendingDelete = null
                    }
                ) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) { Text("Keep") }
            },
        )
    }

    if (queued.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.Outbox,
            title = "Outbox is empty",
            body = "Messages that fail to send wait here until they go out.",
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 104.dp),
    ) {
        items(queued, key = { it.id }) { entry ->
            QueuedRow(
                entry = entry,
                onRetry = { onRetry(entry.id) },
                onDelete = { pendingDelete = entry },
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
    }
}

@Composable
private fun QueuedRow(
    entry: QueuedEmail,
    onRetry: () -> Unit,
    onDelete: () -> Unit,
) {
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = entry.to.ifBlank { "(no recipients)" },
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = MailFormat.listDate(entry.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = muted,
            )
        }
        Text(
            text = entry.subject.ifBlank { "(no subject)" },
            style = MaterialTheme.typography.bodySmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 3.dp),
        )
        Text(
            text = entry.lastError ?: "Waiting to send…",
            style = MaterialTheme.typography.bodySmall,
            color = if (entry.lastError != null) MaterialTheme.colorScheme.error else muted,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 3.dp),
        )
        Row(
            horizontalArrangement = Arrangement.End,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        ) {
            TextButton(onClick = onDelete) { Text("Delete") }
            Spacer(Modifier.width(8.dp))
            OutlinedButton(onClick = onRetry) { Text("Send now") }
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

@Composable
private fun MessageRow(message: EmailMessage, accountColor: Color?, onClick: () -> Unit) {
    val unread = !message.isRead
    val ink = MaterialTheme.colorScheme.onSurface
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val blue = MaterialTheme.colorScheme.primary
    // web: `!isRead && "bg-blue-50/50 dark:bg-slate-800/20"`
    val rowBg = if (unread) blue.copy(alpha = 0.05f) else Color.Transparent

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(rowBg)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box {
            SenderAvatar(from = message.from, size = 44.dp)
            if (unread) {
                // Unread badge pinned to the avatar: the text column never
                // shifts when read state changes, unlike an in-flow dot.
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .size(12.dp)
                        .background(blue, CircleShape)
                        .border(2.dp, MaterialTheme.colorScheme.surface, CircleShape),
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
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

private fun parseAccountColor(hex: String): Color = runCatching {
    Color(android.graphics.Color.parseColor(hex.trim()))
}.getOrDefault(BrandColors.Sky)
