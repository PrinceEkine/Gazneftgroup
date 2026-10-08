package com.gazneftgroup.mail.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.gazneftgroup.mail.ui.theme.BrandColors
import com.gazneftgroup.mail.ui.theme.GazneftTheme

/**
 * The GNmail mark exactly as the website draws it (`src/components/Logo.tsx`):
 * a blue -> cyan gradient-stroked "G" with a white envelope flap, on a dark
 * slate tile with a hairline border. Resolution independent, no bitmap assets.
 */
@Composable
fun BrandMark(
    modifier: Modifier = Modifier,
    size: Dp = 64.dp,
) {
    val dark = isSystemInDarkTheme()
    val tile = if (dark) Color.White.copy(alpha = 0.05f) else BrandColors.Slate900
    val border = if (dark) Color.White.copy(alpha = 0.10f) else BrandColors.Slate200
    val corner = size * 0.28f
    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(corner))
            .background(tile)
            .border(1.dp, border, RoundedCornerShape(corner)),
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val px = this.size.minDimension
            val pad = px * 0.18f
            val s = (px - pad * 2) / 100f
            val gradient = Brush.linearGradient(
                colors = listOf(BrandColors.Blue, BrandColors.Cyan),
                start = Offset(pad, pad),
                end = Offset(px - pad, px - pad),
            )
            val g = Path().apply {
                moveTo(75f * s, 35f * s)
                cubicTo(75f * s, 23.95f * s, 66.05f * s, 15f * s, 55f * s, 15f * s)
                cubicTo(43.95f * s, 15f * s, 35f * s, 23.95f * s, 35f * s, 35f * s)
                lineTo(35f * s, 65f * s)
                cubicTo(35f * s, 76.05f * s, 43.95f * s, 85f * s, 55f * s, 85f * s)
                lineTo(70f * s, 85f * s)
                cubicTo(75.52f * s, 85f * s, 80f * s, 80.52f * s, 80f * s, 75f * s)
                lineTo(80f * s, 55f * s)
                lineTo(55f * s, 55f * s)
            }
            val flap = Path().apply {
                moveTo(35f * s, 35f * s)
                lineTo(55f * s, 50f * s)
                lineTo(75f * s, 35f * s)
            }
            translate(left = pad - 7f * s, top = pad) {
                drawPath(g, brush = gradient, style = Stroke(10f * s, cap = StrokeCap.Round, join = StrokeJoin.Round))
                drawPath(flap, color = Color.White.copy(alpha = 0.85f), style = Stroke(4f * s, cap = StrokeCap.Round, join = StrokeJoin.Round))
                drawCircle(color = Color.White, radius = 4f * s, center = Offset(55f * s, 55f * s))
            }
        }
    }
}

/** Mark + uppercase Anton wordmark, as in the website header and sidebar. */
@Composable
fun Wordmark(modifier: Modifier = Modifier, markSize: Dp = 36.dp) {
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        BrandMark(size = markSize)
        Spacer(Modifier.width(12.dp))
        Text(
            text = "GNMAIL",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Preview
@Composable
private fun BrandMarkPreview() {
    GazneftTheme { Wordmark(markSize = 48.dp) }
}
