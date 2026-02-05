import { describe, it, expect } from 'vitest'
import { generatePKCE, generateState } from './pkce'

describe('pkce', () => {
  describe('generatePKCE', () => {
    it('should generate a code_verifier of 64 characters', async () => {
      const pkce = await generatePKCE()
      expect(pkce.code_verifier).toHaveLength(64)
    })

    it('should generate code_verifier with valid charset only', async () => {
      const pkce = await generatePKCE()
      // RFC 7636: code_verifier uses [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
      const validCharset = /^[A-Za-z0-9\-._~]+$/
      expect(pkce.code_verifier).toMatch(validCharset)
    })

    it('should generate a base64url encoded code_challenge', async () => {
      const pkce = await generatePKCE()
      // Base64url should not contain +, /, or = padding
      expect(pkce.code_challenge).not.toMatch(/[+/=]/)
      // Should only contain base64url characters
      const base64urlCharset = /^[A-Za-z0-9\-_]+$/
      expect(pkce.code_challenge).toMatch(base64urlCharset)
    })

    it('should use S256 as code_challenge_method', async () => {
      const pkce = await generatePKCE()
      expect(pkce.code_challenge_method).toBe('S256')
    })

    it('should generate different values on each call', async () => {
      const pkce1 = await generatePKCE()
      const pkce2 = await generatePKCE()

      expect(pkce1.code_verifier).not.toBe(pkce2.code_verifier)
      expect(pkce1.code_challenge).not.toBe(pkce2.code_challenge)
    })

    it('should generate a code_challenge of expected length for SHA-256', async () => {
      const pkce = await generatePKCE()
      // SHA-256 produces 32 bytes = 256 bits
      // Base64 encodes 3 bytes into 4 chars, so 32 bytes = ~43 chars (without padding)
      expect(pkce.code_challenge.length).toBe(43)
    })

    it('should produce verifiable PKCE pair', async () => {
      // This test verifies the code_challenge is actually derived from code_verifier
      const pkce = await generatePKCE()

      // Manually compute expected challenge
      const encoder = new TextEncoder()
      const data = encoder.encode(pkce.code_verifier)
      const hash = await crypto.subtle.digest('SHA-256', data)
      const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
      const expectedChallenge = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      expect(pkce.code_challenge).toBe(expectedChallenge)
    })
  })

  describe('generateState', () => {
    it('should generate a state of 32 characters', () => {
      const state = generateState()
      expect(state).toHaveLength(32)
    })

    it('should generate state with valid charset only', () => {
      const state = generateState()
      const validCharset = /^[A-Za-z0-9\-._~]+$/
      expect(state).toMatch(validCharset)
    })

    it('should generate different values on each call', () => {
      const state1 = generateState()
      const state2 = generateState()
      expect(state1).not.toBe(state2)
    })

    it('should generate URL-safe state values', () => {
      const state = generateState()
      // Should be safe to use in URL without encoding
      expect(encodeURIComponent(state)).toBe(state)
    })
  })
})
