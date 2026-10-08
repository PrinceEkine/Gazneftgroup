package com.gazneftgroup.mail.ui.compose

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gazneftgroup.mail.core.common.AppResult
import com.gazneftgroup.mail.data.message.MessageRepository
import com.gazneftgroup.mail.domain.model.OutgoingEmail
import com.gazneftgroup.mail.ui.components.ErrorBanner
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import javax.inject.Inject

data class ComposeUiState(
    val to: String = "",
    val subject: String = "",
    val body: String = "",
    val isSending: Boolean = false,
    val sent: Boolean = false,
    val error: String? = null,
) {
    val canSend: Boolean get() = to.isNotBlank() && !isSending
    val hasContent: Boolean get() = to.isNotBlank() || subject.isNotBlank() || body.isNotBlank()
}

@HiltViewModel
class ComposeEmailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val messageRepository: MessageRepository,
) : ViewModel() {

    private val accountId: String =
        URLDecoder.decode(checkNotNull(savedStateHandle["accountId"]), StandardCharsets.UTF_8)

    private val _uiState = MutableStateFlow(
        ComposeUiState(
            to = URLDecoder.decode(savedStateHandle["to"] ?: "", StandardCharsets.UTF_8),
            subject = URLDecoder.decode(savedStateHandle["subject"] ?: "", StandardCharsets.UTF_8),
        )
    )
    val uiState: StateFlow<ComposeUiState> = _uiState.asStateFlow()

    fun onToChanged(value: String) = _uiState.update { it.copy(to = value) }
    fun onSubjectChanged(value: String) = _uiState.update { it.copy(subject = value) }
    fun onBodyChanged(value: String) = _uiState.update { it.copy(body = value) }

    fun send() {
        val state = _uiState.value
        if (!state.canSend) return
        _uiState.update { it.copy(isSending = true, error = null) }
        viewModelScope.launch {
            val result = messageRepository.send(
                OutgoingEmail(
                    accountId = accountId,
                    to = state.to.trim(),
                    subject = state.subject,
                    // Plain text composed on mobile; preserve line breaks as HTML.
                    body = state.body.replace("\n", "<br>"),
                )
            )
            _uiState.update {
                when (result) {
                    is AppResult.Success -> it.copy(isSending = false, sent = true)
                    is AppResult.Error -> it.copy(isSending = false, error = result.error.userMessage)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComposeEmailScreen(
    onDone: () -> Unit,
    viewModel: ComposeEmailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var confirmDiscard by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.sent) {
        if (uiState.sent) onDone()
    }

    val requestClose = {
        if (uiState.hasContent && !uiState.isSending) confirmDiscard = true else onDone()
    }
    BackHandler(onBack = requestClose)

    if (confirmDiscard) {
        AlertDialog(
            onDismissRequest = { confirmDiscard = false },
            title = { Text("Discard this message?") },
            text = { Text("Your draft will not be saved.") },
            confirmButton = {
                TextButton(onClick = { confirmDiscard = false; onDone() }) { Text("Discard") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDiscard = false }) { Text("Keep editing") }
            },
        )
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = { Text("New message") },
                navigationIcon = {
                    IconButton(onClick = requestClose) {
                        Icon(Icons.Outlined.Close, contentDescription = "Close")
                    }
                },
                actions = {
                    Button(
                        onClick = viewModel::send,
                        enabled = uiState.canSend,
                        shape = MaterialTheme.shapes.small,
                        modifier = Modifier.padding(end = 12.dp),
                    ) {
                        if (uiState.isSending) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        } else {
                            Icon(
                                Icons.AutoMirrored.Outlined.Send,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Send")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState()),
        ) {
            uiState.error?.let {
                ErrorBanner(text = it, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            }

            HeaderField(
                label = "To",
                value = uiState.to,
                onValueChange = viewModel::onToChanged,
                placeholder = "",
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            HeaderField(
                label = "Subject",
                value = uiState.subject,
                onValueChange = viewModel::onSubjectChanged,
                placeholder = "",
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Sentences,
                    imeAction = ImeAction.Next,
                ),
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

            TextField(
                value = uiState.body,
                onValueChange = viewModel::onBodyChanged,
                placeholder = {
                    Text(
                        "Message",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                },
                minLines = 12,
                textStyle = MaterialTheme.typography.bodyLarge,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                colors = transparentFieldColors(),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
            )
        }
    }
}

@Composable
private fun HeaderField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardOptions: KeyboardOptions,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(64.dp),
        )
        TextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
            },
            singleLine = true,
            keyboardOptions = keyboardOptions,
            textStyle = MaterialTheme.typography.bodyLarge,
            colors = transparentFieldColors(),
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun transparentFieldColors() = TextFieldDefaults.colors(
    focusedContainerColor = Color.Transparent,
    unfocusedContainerColor = Color.Transparent,
    disabledContainerColor = Color.Transparent,
    errorContainerColor = Color.Transparent,
    focusedIndicatorColor = Color.Transparent,
    unfocusedIndicatorColor = Color.Transparent,
    disabledIndicatorColor = Color.Transparent,
    errorIndicatorColor = Color.Transparent,
)
