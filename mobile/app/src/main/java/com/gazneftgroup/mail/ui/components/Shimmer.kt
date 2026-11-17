package com.gazneftgroup.mail.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gazneftgroup.mail.ui.theme.GazneftMotion
import com.gazneftgroup.mail.ui.theme.GazneftTheme

/**
 * Skeleton placeholders shown while real content loads. They hold the layout
 * still (no jump when content arrives) and read as "working" rather than
 * "broken" — a single spinner can't do either.
 */
@Composable
private fun shimmerBrush(): Brush {
    val base = MaterialTheme.colorScheme.surfaceContainerHigh
    val highlight = MaterialTheme.colorScheme.surfaceContainerLowest
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translate by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1200f,
        animationSpec = infiniteRepeatable(
            animation = tween(GazneftMotion.Slow * 3, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerX",
    )
    return Brush.linearGradient(
        colors = listOf(base, highlight, base),
        start = Offset(translate - 400f, 0f),
        end = Offset(translate, 0f),
    )
}

/** One skeleton inbox row: avatar dot + sender/date lines + snippet lines. */
@Composable
fun ShimmerInboxRow(modifier: Modifier = Modifier) {
    val brush = shimmerBrush()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.size(44.dp).background(brush, CircleShape))
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            ShimmerBar(brush, widthFraction = 0.55f, height = 14.dp)
            Spacer(Modifier.height(8.dp))
            ShimmerBar(brush, widthFraction = 0.85f, height = 12.dp)
            Spacer(Modifier.height(6.dp))
            ShimmerBar(brush, widthFraction = 0.7f, height = 12.dp)
        }
        Spacer(Modifier.width(8.dp))
        Box(modifier = Modifier.size(width = 36.dp, height = 12.dp).background(brush, RoundedCornerShape(6.dp)))
    }
}

/** Skeleton paragraph for the message body while it loads. */
@Composable
fun ShimmerBodyLines(modifier: Modifier = Modifier, lines: Int = 8) {
    val brush = shimmerBrush()
    Column(modifier = modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        repeat(lines) { index ->
            val fraction = when (index % 4) {
                0 -> 0.95f
                1 -> 0.8f
                2 -> 0.9f
                else -> 0.6f
            }
            ShimmerBar(brush, widthFraction = fraction, height = 13.dp)
            Spacer(Modifier.height(10.dp))
        }
    }
}

@Composable
private fun ShimmerBar(brush: Brush, widthFraction: Float, height: Dp) {
    Box(
        modifier = Modifier
            .fillMaxWidth(widthFraction)
            .height(height)
            .background(brush, RoundedCornerShape(6.dp)),
    )
}

@Suppress("UnusedPrivateMember")
@Preview(showBackground = true)
@Composable
private fun ShimmerPreview() {
    GazneftTheme {
        Column {
            ShimmerInboxRow()
            ShimmerBodyLines(lines = 3)
        }
    }
}
