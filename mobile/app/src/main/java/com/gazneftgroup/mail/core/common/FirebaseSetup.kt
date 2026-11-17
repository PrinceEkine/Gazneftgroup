package com.gazneftgroup.mail.core.common

/**
 * Single-Firebase-project rule: the Android app, the web app and the admin
 * API must all talk to the SAME Firebase project and the SAME Firestore
 * database (a named database — see BuildConfig.FIRESTORE_DATABASE_ID and the
 * web app's firebase-applet-config.json). When this build still carries the
 * committed placeholder google-services.json, auth fails with a cryptic
 * API-key error and no accounts ever sync — so callers fail loud instead.
 */
object FirebaseSetup {

    /** Project id baked into the committed placeholder google-services.json. */
    const val PLACEHOLDER_PROJECT_ID = "gazneft-mail"

    /**
     * True when [projectId] (BuildConfig.FIREBASE_PROJECT_ID, parsed from
     * google-services.json at build time) is missing or still the placeholder.
     */
    fun isPlaceholderProject(projectId: String): Boolean =
        projectId.isBlank() || projectId == PLACEHOLDER_PROJECT_ID
}
