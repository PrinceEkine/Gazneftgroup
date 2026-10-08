package com.gazneftgroup.mail.core.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import javax.crypto.AEADBadTagException

class DraftCryptoTest {

    @Test
    fun `round trip with correct pin`() {
        val plaintext = """{"to":"a@b.com","subject":"hi","body":"secret"}"""
        val encrypted = DraftCrypto.encrypt(plaintext, "483920")
        assertEquals(plaintext, DraftCrypto.decrypt(encrypted, "483920"))
    }

    @Test
    fun `wrong pin fails authentication, not silently`() {
        val encrypted = DraftCrypto.encrypt("secret", "1234")
        assertThrows(AEADBadTagException::class.java) {
            DraftCrypto.decrypt(encrypted, "9999")
        }
    }

    @Test
    fun `same input produces different ciphertext every time`() {
        val a = DraftCrypto.encrypt("secret", "1234")
        val b = DraftCrypto.encrypt("secret", "1234")
        // Fresh random salt + IV per share: no ciphertext correlation.
        assert(a.ciphertextB64 != b.ciphertextB64)
        assert(a.saltB64 != b.saltB64)
    }
}
