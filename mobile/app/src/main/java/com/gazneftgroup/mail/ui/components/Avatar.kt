package com.gazneftgroup.mail.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gazneftgroup.mail.ui.theme.BrandColors
import com.gazneftgroup.mail.ui.theme.GazneftTheme
import com.gazneftgroup.mail.ui.util.MailFormat

/**
 * Sender avatar: initials on a deterministic palette colour, so every sender
 * is recognisable at a glance and stable across sessions and screens.
 */
@Composable
fun SenderAvatar(
    from: String,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
) {
    val color = BrandColors.Avatars[MailFormat.avatarColorIndex(from, BrandColors.Avatars.size)]
    Box(
        modifier = modifier
            .size(size)
            .background(color, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = MailFormat.initials(from),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
    }
}

@Preview
@Composable
private fun SenderAvatarPreview() {
    GazneftTheme {
        SenderAvatar(from = "Jane Doe <jane@example.com>")
    }
}
