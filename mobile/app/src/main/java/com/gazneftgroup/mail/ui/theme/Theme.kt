package com.gazneftgroup.mail.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = BrandColors.Blue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDBEAFE),
    onPrimaryContainer = Color(0xFF1E3A8A),
    secondary = BrandColors.Cyan,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFCFFAFE),
    onSecondaryContainer = Color(0xFF164E63),
    tertiary = BrandColors.Sky,
    onTertiary = Color.White,
    background = BrandColors.Slate50,
    onBackground = BrandColors.Slate900,
    surface = Color.White,
    onSurface = BrandColors.Slate900,
    surfaceVariant = BrandColors.Slate100,
    onSurfaceVariant = BrandColors.Slate600,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = BrandColors.Slate50,
    surfaceContainer = BrandColors.Slate100,
    surfaceContainerHigh = BrandColors.Slate200,
    surfaceContainerHighest = BrandColors.Slate200,
    outline = BrandColors.Slate300,
    outlineVariant = BrandColors.Slate200,
    error = BrandColors.Red,
    onError = Color.White,
    errorContainer = BrandColors.RedSoft,
    onErrorContainer = Color(0xFF7F1D1D),
    inverseSurface = BrandColors.Slate900,
    inverseOnSurface = BrandColors.Slate100,
    inversePrimary = Color(0xFF93C5FD),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF60A5FA),
    onPrimary = Color(0xFF0B1F4D),
    primaryContainer = Color(0xFF1E3A8A),
    onPrimaryContainer = Color(0xFFDBEAFE),
    secondary = Color(0xFF22D3EE),
    onSecondary = Color(0xFF083344),
    secondaryContainer = Color(0xFF155E75),
    onSecondaryContainer = Color(0xFFCFFAFE),
    tertiary = Color(0xFF38BDF8),
    onTertiary = Color(0xFF082F49),
    background = BrandColors.Slate950,
    onBackground = BrandColors.Slate100,
    surface = BrandColors.Slate900,
    onSurface = BrandColors.Slate100,
    surfaceVariant = BrandColors.Slate800,
    onSurfaceVariant = BrandColors.Slate400,
    surfaceContainerLowest = BrandColors.Slate950,
    surfaceContainerLow = BrandColors.Slate900,
    surfaceContainer = BrandColors.Slate800,
    surfaceContainerHigh = BrandColors.Slate700,
    surfaceContainerHighest = BrandColors.Slate700,
    outline = BrandColors.Slate600,
    outlineVariant = BrandColors.Slate800,
    error = BrandColors.RedDark,
    onError = Color(0xFF450A0A),
    errorContainer = BrandColors.RedSoftDark,
    onErrorContainer = Color(0xFFFECACA),
    inverseSurface = BrandColors.Slate100,
    inverseOnSurface = BrandColors.Slate900,
    inversePrimary = BrandColors.Blue,
)

val GazneftShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(14.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

@Composable
fun GazneftTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = GazneftTypography,
        shapes = GazneftShapes,
        content = content,
    )
}

@Preview(showBackground = true)
@Composable
private fun ThemePreview() {
    GazneftTheme {
        Text(
            text = "Hello GNmail",
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.headlineMedium,
        )
    }
}
