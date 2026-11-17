package com.gazneftgroup.mail.ui.theme

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally

/**
 * The app's motion language in one place: every screen transition, list
 * animation and reveal shares these durations and curves so movement feels
 * designed rather than default. Motion is purposeful and quick — surfaces
 * glide, nothing bounces, nothing fades up on scroll.
 */
object GazneftMotion {

    /** Micro feedback: button content swaps, tab indicator, badge pops. */
    const val Fast = 150

    /** Default: screen pushes, card entrances, shimmer sweeps. */
    const val Medium = 300

    /** Large reveals only (first-load list stagger window). */
    const val Slow = 450

    /** Material standard easing: quick in, gentle settle. */
    val StandardEasing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)

    /** Emphasized easing for hero movements (auth card entrance). */
    val EmphasizedEasing = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1.0f)

    /**
     * Mail-style push: the new screen glides in from the right over a fade
     * while the current one drifts slightly left. Used inbox <-> detail and
     * inbox -> compose.
     */
    val pushEnter: EnterTransition =
        slideInHorizontally(tween(Medium, easing = StandardEasing)) { it / 3 } +
            fadeIn(tween(Medium))

    val pushExit: ExitTransition =
        slideOutHorizontally(tween(Medium, easing = StandardEasing)) { -it / 4 } +
            fadeOut(tween(Medium))

    val popEnter: EnterTransition =
        slideInHorizontally(tween(Medium, easing = StandardEasing)) { -it / 4 } +
            fadeIn(tween(Medium))

    val popExit: ExitTransition =
        slideOutHorizontally(tween(Medium, easing = StandardEasing)) { it / 3 } +
            fadeOut(tween(Medium))

    /** Quiet crossfade for auth <-> inbox, where there is no spatial stack. */
    val fadeEnter: EnterTransition = fadeIn(tween(Medium))

    val fadeExit: ExitTransition = fadeOut(tween(Fast))
}
