import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildDiscoveryUrl,
  buildOIDCDiscoveryUrl,
  buildAuthorizationUrl,
  getDefaultRegistrationRequest,
  getCallbackUrl,
  discoverMetadata,
  registerClient,
  exchangeToken,
  FetchError,
} from './oauth'
import * as proxy from './proxy'

// Mock window.location for getCallbackUrl tests
const mockLocation = {
  origin: 'http://localhost:3000',
  pathname: '/',
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('oauth', () => {
  describe('buildDiscoveryUrl', () => {
    it('should build OAuth discovery URL for simple domain', () => {
      const url = buildDiscoveryUrl('https://auth.example.com')
      expect(url).toBe('https://auth.example.com/.well-known/oauth-authorization-server')
    })

    it('should build OAuth discovery URL for domain with trailing slash', () => {
      const url = buildDiscoveryUrl('https://auth.example.com/')
      expect(url).toBe('https://auth.example.com/.well-known/oauth-authorization-server')
    })

    it('should build OAuth discovery URL for domain with path', () => {
      const url = buildDiscoveryUrl('https://example.com/oauth')
      expect(url).toBe('https://example.com/.well-known/oauth-authorization-server/oauth')
    })

    it('should build OAuth discovery URL for domain with nested path', () => {
      const url = buildDiscoveryUrl('https://example.com/auth/v1')
      expect(url).toBe('https://example.com/.well-known/oauth-authorization-server/auth/v1')
    })

    it('should preserve port in URL', () => {
      const url = buildDiscoveryUrl('https://localhost:8080')
      expect(url).toBe('https://localhost:8080/.well-known/oauth-authorization-server')
    })
  })

  describe('buildOIDCDiscoveryUrl', () => {
    it('should build OIDC discovery URL for simple domain', () => {
      const url = buildOIDCDiscoveryUrl('https://auth.example.com')
      expect(url).toBe('https://auth.example.com/.well-known/openid-configuration')
    })

    it('should build OIDC discovery URL for domain with trailing slash', () => {
      const url = buildOIDCDiscoveryUrl('https://auth.example.com/')
      expect(url).toBe('https://auth.example.com/.well-known/openid-configuration')
    })

    it('should build OIDC discovery URL for domain with path', () => {
      const url = buildOIDCDiscoveryUrl('https://example.com/oauth')
      expect(url).toBe('https://example.com/oauth/.well-known/openid-configuration')
    })

    it('should build OIDC discovery URL for domain with nested path', () => {
      const url = buildOIDCDiscoveryUrl('https://example.com/auth/v1')
      expect(url).toBe('https://example.com/auth/v1/.well-known/openid-configuration')
    })
  })

  describe('getCallbackUrl', () => {
    it('should return callback URL based on current location', () => {
      mockLocation.origin = 'http://localhost:3000'
      mockLocation.pathname = '/'
      expect(getCallbackUrl()).toBe('http://localhost:3000/callback.html')
    })

    it('should handle pathname with trailing slash', () => {
      mockLocation.origin = 'http://localhost:3000'
      mockLocation.pathname = '/app/'
      expect(getCallbackUrl()).toBe('http://localhost:3000/app/callback.html')
    })

    it('should handle pathname without trailing slash', () => {
      mockLocation.origin = 'http://localhost:3000'
      mockLocation.pathname = '/app'
      expect(getCallbackUrl()).toBe('http://localhost:3000/app/callback.html')
    })
  })

  describe('getDefaultRegistrationRequest', () => {
    it('should return default registration request', () => {
      mockLocation.origin = 'http://localhost:3000'
      mockLocation.pathname = '/'

      const request = getDefaultRegistrationRequest()

      expect(request.redirect_uris).toEqual(['http://localhost:3000/callback.html'])
      expect(request.client_name).toBe('OAuth Tester')
      expect(request.token_endpoint_auth_method).toBe('client_secret_basic')
      expect(request.grant_types).toEqual(['authorization_code', 'refresh_token'])
      expect(request.response_types).toEqual(['code'])
    })
  })

  describe('buildAuthorizationUrl', () => {
    const baseParams = {
      authorizationEndpoint: 'https://auth.example.com/authorize',
      responseType: 'code',
      clientId: 'test-client',
      redirectUri: 'http://localhost:3000/callback',
      scope: 'openid profile',
      state: 'random-state',
      codeChallenge: 'challenge123',
      codeChallengeMethod: 'S256',
    }

    it('should build authorization URL with all parameters', () => {
      const url = buildAuthorizationUrl(baseParams)
      const parsed = new URL(url)

      expect(parsed.origin).toBe('https://auth.example.com')
      expect(parsed.pathname).toBe('/authorize')
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('client_id')).toBe('test-client')
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback')
      expect(parsed.searchParams.get('scope')).toBe('openid profile')
      expect(parsed.searchParams.get('state')).toBe('random-state')
      expect(parsed.searchParams.get('code_challenge')).toBe('challenge123')
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('should omit scope when empty string', () => {
      const url = buildAuthorizationUrl({ ...baseParams, scope: '' })
      const parsed = new URL(url)

      expect(parsed.searchParams.has('scope')).toBe(false)
    })

    it('should send empty scope when single space', () => {
      const url = buildAuthorizationUrl({ ...baseParams, scope: ' ' })
      const parsed = new URL(url)

      expect(parsed.searchParams.get('scope')).toBe('')
    })

    it('should preserve existing query parameters in endpoint', () => {
      const url = buildAuthorizationUrl({
        ...baseParams,
        authorizationEndpoint: 'https://auth.example.com/authorize?tenant=abc',
      })
      const parsed = new URL(url)

      expect(parsed.searchParams.get('tenant')).toBe('abc')
      expect(parsed.searchParams.get('client_id')).toBe('test-client')
    })
  })

  describe('discoverMetadata', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should discover metadata from OAuth endpoint', async () => {
      const mockMetadata = {
        issuer: 'https://auth.example.com',
        authorization_endpoint: 'https://auth.example.com/authorize',
        token_endpoint: 'https://auth.example.com/token',
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockMetadata)),
      })

      const result = await discoverMetadata('https://auth.example.com')

      expect(result.metadata).toEqual(mockMetadata)
      expect(result.exchange.request.url).toBe(
        'https://auth.example.com/.well-known/oauth-authorization-server'
      )
    })

    it('should fallback to OIDC discovery on 404', async () => {
      const mockMetadata = {
        issuer: 'https://auth.example.com',
        authorization_endpoint: 'https://auth.example.com/authorize',
        token_endpoint: 'https://auth.example.com/token',
      }

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: new Headers(),
          text: () => Promise.resolve('Not Found'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve(JSON.stringify(mockMetadata)),
        })

      const result = await discoverMetadata('https://auth.example.com')

      expect(result.metadata).toEqual(mockMetadata)
      expect(result.exchange.request.url).toBe(
        'https://auth.example.com/.well-known/openid-configuration'
      )
    })

    it('should throw FetchError on non-404 error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        text: () => Promise.resolve('Server Error'),
      })

      await expect(discoverMetadata('https://auth.example.com')).rejects.toThrow(FetchError)
    })

    it('should include OAuth error details in error message', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: 'invalid_request',
              error_description: 'Missing required parameter',
            })
          ),
      })

      try {
        await discoverMetadata('https://auth.example.com')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError)
        expect((error as FetchError).message).toBe('invalid_request: Missing required parameter')
      }
    })
  })

  describe('registerClient', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should register client and return credentials', async () => {
      const mockResponse = {
        client_id: 'new-client-id',
        client_secret: 'new-client-secret',
        client_id_issued_at: 1234567890,
      }

      vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockResponse),
        },
        data: mockResponse,
        exchange: {
          request: {
            method: 'POST',
            url: 'https://auth.example.com/register',
            headers: {},
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockResponse),
          },
          timestamp: Date.now(),
        },
      })

      const result = await registerClient('https://auth.example.com/register', {
        redirect_uris: ['http://localhost:3000/callback'],
        client_name: 'Test Client',
      })

      expect(result.credentials.client_id).toBe('new-client-id')
      expect(result.credentials.client_secret).toBe('new-client-secret')
    })

    it('should throw error when response missing client_id', async () => {
      const mockResponse = {
        client_secret: 'secret-without-id',
      }

      vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockResponse),
        },
        data: mockResponse,
        exchange: {
          request: {
            method: 'POST',
            url: 'https://auth.example.com/register',
            headers: {},
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockResponse),
          },
          timestamp: Date.now(),
        },
      })

      await expect(
        registerClient('https://auth.example.com/register', {
          redirect_uris: ['http://localhost:3000/callback'],
        })
      ).rejects.toThrow('Registration response missing client_id')
    })

    it('should handle empty string fields correctly', async () => {
      const mockResponse = { client_id: 'test-id' }

      const proxyFetchSpy = vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockResponse),
        },
        data: mockResponse,
        exchange: {
          request: { method: 'POST', url: 'https://auth.example.com/register', headers: {} },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockResponse),
          },
          timestamp: Date.now(),
        },
      })

      await registerClient('https://auth.example.com/register', {
        redirect_uris: ['http://localhost:3000/callback'],
        client_name: '', // Empty string should be omitted
        scope: ' ', // Single space should send empty string
      })

      const requestBody = JSON.parse(proxyFetchSpy.mock.calls[0][0].body as string)
      expect(requestBody.client_name).toBeUndefined()
      expect(requestBody.scope).toBe('')
    })
  })

  describe('exchangeToken', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should exchange code for tokens', async () => {
      const mockTokens = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token-456',
      }

      vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockTokens),
        },
        data: mockTokens,
        exchange: {
          request: {
            method: 'POST',
            url: 'https://auth.example.com/token',
            headers: {},
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockTokens),
          },
          timestamp: Date.now(),
        },
      })

      const result = await exchangeToken({
        tokenEndpoint: 'https://auth.example.com/token',
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/callback',
        clientId: 'test-client',
        codeVerifier: 'verifier-123',
      })

      expect(result.tokens.access_token).toBe('access-token-123')
      expect(result.tokens.refresh_token).toBe('refresh-token-456')
    })

    it('should include Basic auth header when client_secret provided', async () => {
      const mockTokens = { access_token: 'token', token_type: 'Bearer' }

      const proxyFetchSpy = vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockTokens),
        },
        data: mockTokens,
        exchange: {
          request: { method: 'POST', url: 'https://auth.example.com/token', headers: {} },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockTokens),
          },
          timestamp: Date.now(),
        },
      })

      await exchangeToken({
        tokenEndpoint: 'https://auth.example.com/token',
        code: 'auth-code',
        redirectUri: 'http://localhost:3000/callback',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        codeVerifier: 'verifier',
      })

      const request = proxyFetchSpy.mock.calls[0][0]
      expect(request.headers['Authorization']).toBe(`Basic ${btoa('test-client:test-secret')}`)
    })

    it('should not include auth header when no client_secret', async () => {
      const mockTokens = { access_token: 'token', token_type: 'Bearer' }

      const proxyFetchSpy = vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockTokens),
        },
        data: mockTokens,
        exchange: {
          request: { method: 'POST', url: 'https://auth.example.com/token', headers: {} },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockTokens),
          },
          timestamp: Date.now(),
        },
      })

      await exchangeToken({
        tokenEndpoint: 'https://auth.example.com/token',
        code: 'auth-code',
        redirectUri: 'http://localhost:3000/callback',
        clientId: 'test-client',
        codeVerifier: 'verifier',
      })

      const request = proxyFetchSpy.mock.calls[0][0]
      expect(request.headers['Authorization']).toBeUndefined()
    })

    it('should throw error when response missing access_token', async () => {
      const mockResponse = { token_type: 'Bearer', expires_in: 3600 }

      vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockResponse),
        },
        data: mockResponse,
        exchange: {
          request: { method: 'POST', url: 'https://auth.example.com/token', headers: {} },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockResponse),
          },
          timestamp: Date.now(),
        },
      })

      await expect(
        exchangeToken({
          tokenEndpoint: 'https://auth.example.com/token',
          code: 'auth-code',
          redirectUri: 'http://localhost:3000/callback',
          clientId: 'test-client',
          codeVerifier: 'verifier',
        })
      ).rejects.toThrow('Token response missing access_token')
    })

    it('should send correct form body parameters', async () => {
      const mockTokens = { access_token: 'token', token_type: 'Bearer' }

      const proxyFetchSpy = vi.spyOn(proxy, 'proxyFetch').mockResolvedValueOnce({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: JSON.stringify(mockTokens),
        },
        data: mockTokens,
        exchange: {
          request: { method: 'POST', url: 'https://auth.example.com/token', headers: {} },
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockTokens),
          },
          timestamp: Date.now(),
        },
      })

      await exchangeToken({
        tokenEndpoint: 'https://auth.example.com/token',
        code: 'my-auth-code',
        redirectUri: 'http://localhost:3000/callback',
        clientId: 'my-client-id',
        codeVerifier: 'my-code-verifier',
      })

      const request = proxyFetchSpy.mock.calls[0][0]
      const body = new URLSearchParams(request.body as string)

      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('code')).toBe('my-auth-code')
      expect(body.get('redirect_uri')).toBe('http://localhost:3000/callback')
      expect(body.get('client_id')).toBe('my-client-id')
      expect(body.get('code_verifier')).toBe('my-code-verifier')
    })
  })

  describe('FetchError', () => {
    it('should create error with message and exchange', () => {
      const exchange = {
        request: { method: 'GET', url: 'https://example.com', headers: {} },
        timestamp: Date.now(),
        error: 'Network error',
      }

      const error = new FetchError('Test error', exchange)

      expect(error.message).toBe('Test error')
      expect(error.name).toBe('FetchError')
      expect(error.exchange).toBe(exchange)
    })
  })
})
