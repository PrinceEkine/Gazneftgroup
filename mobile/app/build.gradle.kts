plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.google.services)
    alias(libs.plugins.crashlytics)
}

/**
 * Web OAuth client ID used for Google sign-in (Credential Manager needs the
 * *web* client, not the Android one). Resolved from, in order: the
 * GOOGLE_WEB_CLIENT_ID Gradle property / env var, then the `oauth_client`
 * entry of type 3 in google-services.json, which Firebase adds once the app's
 * SHA-1 fingerprint is registered and the Google provider is enabled.
 */
val googleWebClientId: String = run {
    val explicit = (project.findProperty("GOOGLE_WEB_CLIENT_ID") as String?)
        ?: System.getenv("GOOGLE_WEB_CLIENT_ID")
    if (!explicit.isNullOrBlank()) return@run explicit
    val json = file("google-services.json")
    if (!json.exists()) return@run ""
    @Suppress("UNCHECKED_CAST")
    val root = groovy.json.JsonSlurper().parseText(json.readText()) as Map<String, Any?>
    @Suppress("UNCHECKED_CAST")
    val clients = root["client"] as? List<Map<String, Any?>> ?: emptyList()
    @Suppress("UNCHECKED_CAST")
    clients.flatMap { (it["oauth_client"] as? List<Map<String, Any?>>) ?: emptyList() }
        .firstOrNull { (it["client_type"] as? Number)?.toInt() == 3 }
        ?.get("client_id") as? String ?: ""
}

android {
    namespace = "com.gazneftgroup.mail"
    compileSdk = 35

    signingConfigs {
        // Shared debug keystore (committed on purpose) so CI, teammates and the
        // Firebase console all see the same SHA-1 for Google sign-in.
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    defaultConfig {
        applicationId = "com.gazneftgroup.mail"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
    }

    buildTypes {
        debug {
            // Debug talks to the live Netlify proxy so testers need no local server.
            // To hit a server on your PC from the emulator, use "http://10.0.2.2:3000".
            buildConfigField("String", "API_BASE_URL", "\"https://gazneftgroup.netlify.app\"")
            isMinifyEnabled = false
        }
        release {
            // TODO(hosting): production is moving to Cloudflare and no domain is
            // owned yet. Replace with the mail-proxy's real URL (a *.pages.dev /
            // Node-host URL for now, the owned domain later) before any release
            // build ships. The Netlify URL below is the current legacy deploy.
            buildConfigField("String", "API_BASE_URL", "\"https://gazneftgroup.netlify.app\"")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.activity.compose)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)
    implementation(libs.androidx.navigation.compose)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // DI
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    // Persistence + paging (offline-first inbox)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    implementation(libs.room.paging)
    ksp(libs.room.compiler)
    implementation(libs.paging.runtime)
    implementation(libs.paging.compose)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    // Firebase
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services)
    implementation(libs.googleid)
    implementation(libs.firebase.firestore)
    implementation(libs.firebase.messaging)
    implementation(libs.firebase.crashlytics)
    implementation(libs.firebase.analytics)

    // Background sync
    implementation(libs.work.runtime)

    implementation(libs.coil.compose)

    testImplementation(libs.junit)
    testImplementation(libs.turbine)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.mockk)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso)
}
