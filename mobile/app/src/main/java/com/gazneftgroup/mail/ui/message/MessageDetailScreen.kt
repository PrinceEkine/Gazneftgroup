package com.gazneftgroup.mail.ui.message

import android.annotation.SuppressLint
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Reply
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gazneftgroup.mail.core.common.onError
import com.gazneftgroup.mail.data.message.MessageRepository
import com.gazneftgroup.mail.domain.model.EmailMessage
import com.gazneftgroup.mail.ui.components.ErrorBanner
import com.gazneftgroup.mail.ui.util.MailFormat
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import javax.inject.Inject

@HiltViewModel
class MessageDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val messageRepository: MessageRepository,
) : ViewModel() {

    private val messageId: String =
        URLDecoder.decode(checkNotNull(savedStateHandle["messageId"]), StandardCharsets.UTF_8)

    val message: StateFlow<EmailMessage?> = messageRepository.observeMessage(messageId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        // Lazy body hydration: the list sync only carries envelopes.
        viewModelScope.launch {
            val current = message.filterNotNull().first()
            messageRepository.ensureBody(current)
                .onError { _error.value = it.userMessage }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessageDetailScreen(
    onBack: () -> Unit,
    onReply: (accountId: String, to: String, subject: String) -> Unit,
    viewModel: MessageDetailViewModel = hiltViewModel(),
) {
    val message by viewModel.message.collectAsState()
    val error by viewModel.error.collectAsState()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        bottomBar = {
            message?.let { msg ->
                Column(modifier = Modifier.background(MaterialTheme.colorScheme.surface)) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    FilledTonalButton(
                        onClick = {
                            val replyTo = MailFormat.address(msg.from) ?: msg.from
                            val subject = if (msg.subject.startsWith("Re:", ignoreCase = true)) msg.subject
                            else "Re: ${msg.subject}"
                            onReply(msg.accountId, replyTo, subject)
                        },
                        shape = MaterialTheme.shapes.small,
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                            contentColor = MaterialTheme.colorScheme.primary,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(horizontal = 20.dp, vertical = 12.dp)
                            .height(48.dp),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Outlined.Reply,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("Reply")
                    }
                }
            }
        },
    ) { padding ->
        val msg = message ?: return@Scaffold
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            Text(
                text = msg.subject.ifBlank { "(no subject)" },
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 10.dp),
            )

            Column(modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = MailFormat.displayName(msg.from),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        text = MailFormat.fullDate(msg.date),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                MailFormat.address(msg.from)?.let { address ->
                    Text(
                        text = address,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (msg.to.isNotBlank()) {
                    Row(modifier = Modifier.padding(top = 2.dp)) {
                        Text("to ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = msg.to,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

            error?.let {
                ErrorBanner(text = it, modifier = Modifier.padding(16.dp))
            }

            if (msg.body.isEmpty() && error == null) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                Text(
                    text = "Loading message…",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(20.dp),
                )
            } else if (msg.body.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                EmailBody(html = msg.body)
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

/**
 * Email bodies are arbitrary HTML, rendered in a sandboxed WebView with JS off.
 * We inject a small stylesheet so content respects the viewport, wraps long
 * lines, and inherits the app's text colour in dark mode.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun EmailBody(html: String) {
    val textColor = MaterialTheme.colorScheme.onSurface
    val linkColor = MaterialTheme.colorScheme.primary
    val document = remember(html, textColor, linkColor) {
        wrapEmailHtml(html, textColor, linkColor)
    }
    AndroidView(
        modifier = Modifier.fillMaxWidth(),
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = false
                settings.loadsImagesAutomatically = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false
            }
        },
        update = { webView ->
            if (webView.tag != document) {
                webView.tag = document
                webView.loadDataWithBaseURL(null, document, "text/html", "utf-8", null)
            }
        },
    )
}

private fun Color.toCssHex(): String = String.format("#%06X", 0xFFFFFF and toArgb())

internal fun wrapEmailHtml(body: String, textColor: Color, linkColor: Color): String {
    val head = """
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          html,body{margin:0;padding:0;background:transparent;}
          body{padding:0 20px 8px;font-family:sans-serif;font-size:15px;line-height:1.55;
               color:${textColor.toCssHex()};word-wrap:break-word;overflow-wrap:anywhere;}
          img{max-width:100% !important;height:auto !important;}
          table{max-width:100% !important;}
          pre{white-space:pre-wrap;}
          a{color:${linkColor.toCssHex()};}
          blockquote{border-left:3px solid #94a3b8;margin:8px 0;padding-left:12px;opacity:.85;}
        </style>
    """.trimIndent()
    val headIndex = body.indexOf("<head", ignoreCase = true)
    return if (headIndex >= 0) {
        val close = body.indexOf('>', headIndex)
        if (close >= 0) body.substring(0, close + 1) + head + body.substring(close + 1) else head + body
    } else {
        "<!doctype html><html><head>$head</head><body>$body</body></html>"
    }
}
