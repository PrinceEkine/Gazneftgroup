package com.gazneftgroup.mail.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * GNmail brand palette. Mirrors the web app: a blue -> cyan gradient brand
 * mark on a slate neutral scale (Tailwind slate), so the Android and web
 * clients read as one product.
 */
object BrandColors {
    val Blue = Color(0xFF2563EB)      // brand start
    val Cyan = Color(0xFF0891B2)      // brand end
    val Sky = Color(0xFF0EA5E9)       // accent / default account colour

    val Slate50 = Color(0xFFF8FAFC)
    val Slate100 = Color(0xFFF1F5F9)
    val Slate200 = Color(0xFFE2E8F0)
    val Slate300 = Color(0xFFCBD5E1)
    val Slate400 = Color(0xFF94A3B8)
    val Slate500 = Color(0xFF64748B)
    val Slate600 = Color(0xFF475569)
    val Slate700 = Color(0xFF334155)
    val Slate800 = Color(0xFF1E293B)
    val Slate900 = Color(0xFF0F172A)
    val Slate950 = Color(0xFF020617)

    val Red = Color(0xFFDC2626)
    val RedSoft = Color(0xFFFEE2E2)
    val RedDark = Color(0xFFF87171)
    val RedSoftDark = Color(0xFF450A0A)

    /** Deterministic avatar colours for senders without a photo. */
    val Avatars = listOf(
        Color(0xFF2563EB), Color(0xFF0891B2), Color(0xFF7C3AED), Color(0xFFDB2777),
        Color(0xFFEA580C), Color(0xFF16A34A), Color(0xFF0D9488), Color(0xFFCA8A04),
        Color(0xFF4F46E5), Color(0xFFE11D48),
    )
}
