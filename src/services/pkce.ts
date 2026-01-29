import type { PKCEState } from '../types'

// Generate a random string for code_verifier (43-128 characters)
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join('')
}

// Generate SHA-256 hash and base64url encode
async function sha256Base64Url(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Generate PKCE code_verifier and code_challenge
export async function generatePKCE(): Promise<PKCEState> {
  const codeVerifier = generateRandomString(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)

  return {
    code_verifier: codeVerifier,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }
}

// Generate random state parameter
export function generateState(): string {
  return generateRandomString(32)
}
