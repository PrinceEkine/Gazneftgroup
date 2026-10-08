package com.gazneftgroup.mail.core.crypto

import java.util.Base64
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * PIN-based draft encryption, byte-compatible with the web implementation
 * (src/lib/secureDraftShare.ts): PBKDF2-HMAC-SHA256 (150k iterations,
 * 16-byte salt) -> AES-256-GCM (12-byte IV, 128-bit tag). A draft shared
 * from Android opens on web with the same PIN and vice versa.
 */
object DraftCrypto {

    const val KDF_ITERATIONS = 150_000
    private const val KEY_BITS = 256
    private const val GCM_TAG_BITS = 128
    private val random = SecureRandom()

    data class Encrypted(
        val saltB64: String,
        val ivB64: String,
        val ciphertextB64: String,
    )

    fun encrypt(plaintext: String, pin: String): Encrypted {
        val salt = ByteArray(16).also(random::nextBytes)
        val iv = ByteArray(12).also(random::nextBytes)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.ENCRYPT_MODE, deriveKey(pin, salt), GCMParameterSpec(GCM_TAG_BITS, iv))
        }
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return Encrypted(
            saltB64 = Base64.getEncoder().encodeToString(salt),
            ivB64 = Base64.getEncoder().encodeToString(iv),
            ciphertextB64 = Base64.getEncoder().encodeToString(ciphertext),
        )
    }

    /** @throws javax.crypto.AEADBadTagException when the PIN is wrong. */
    fun decrypt(encrypted: Encrypted, pin: String): String {
        val salt = Base64.getDecoder().decode(encrypted.saltB64)
        val iv = Base64.getDecoder().decode(encrypted.ivB64)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.DECRYPT_MODE, deriveKey(pin, salt), GCMParameterSpec(GCM_TAG_BITS, iv))
        }
        val plaintext = cipher.doFinal(Base64.getDecoder().decode(encrypted.ciphertextB64))
        return String(plaintext, Charsets.UTF_8)
    }

    private fun deriveKey(pin: String, salt: ByteArray): SecretKeySpec {
        val spec = PBEKeySpec(pin.toCharArray(), salt, KDF_ITERATIONS, KEY_BITS)
        val key = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec)
        return SecretKeySpec(key.encoded, "AES")
    }
}
