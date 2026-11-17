package com.gazneftgroup.mail.core.common

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirebaseSetupTest {

    @Test
    fun `blank project id is a placeholder`() {
        assertTrue(FirebaseSetup.isPlaceholderProject(""))
        assertTrue(FirebaseSetup.isPlaceholderProject("   "))
    }

    @Test
    fun `committed placeholder project id is a placeholder`() {
        assertTrue(FirebaseSetup.isPlaceholderProject(FirebaseSetup.PLACEHOLDER_PROJECT_ID))
    }

    @Test
    fun `real project id is not a placeholder`() {
        assertFalse(FirebaseSetup.isPlaceholderProject("ai-studio-applet-webapp-9f138"))
    }
}
