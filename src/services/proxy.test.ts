import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { proxyFetch, ProxyFetchError } from './proxy'
import type { HttpRequest } from '../types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock window.location.origin
vi.stubGlobal('window', {
  location: {
    origin: 'http://localhost:3000',
  },
})

describe('proxyFetch', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should make a POST request to the proxy endpoint', async () => {
    const mockProxyResponse = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"result": "success"}',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const request: HttpRequest = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: { Accept: 'application/json' },
    }

    await proxyFetch(request)

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/api',
        method: 'GET',
        headers: { Accept: 'application/json' },
        body: undefined,
      }),
    })
  })

  it('should return response, data, and exchange on success', async () => {
    const mockProxyResponse = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"client_id": "test123"}',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const request: HttpRequest = {
      method: 'POST',
      url: 'https://auth.example.com/register',
      headers: { 'Content-Type': 'application/json' },
      body: '{"redirect_uris": ["http://localhost"]}',
    }

    const result = await proxyFetch(request)

    expect(result.response.status).toBe(200)
    expect(result.response.statusText).toBe('OK')
    expect(result.response.headers).toEqual({ 'content-type': 'application/json' })
    expect(result.data).toEqual({ client_id: 'test123' })
    expect(result.exchange.request).toBe(request)
    expect(result.exchange.response).toBeDefined()
  })

  it('should parse JSON response body', async () => {
    const mockProxyResponse = {
      status: 200,
      headers: {},
      body: '{"key": "value", "number": 42}',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const request: HttpRequest = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: {},
    }

    const result = await proxyFetch(request)

    expect(result.data).toEqual({ key: 'value', number: 42 })
  })

  it('should return raw body when JSON parsing fails', async () => {
    const mockProxyResponse = {
      status: 200,
      headers: {},
      body: 'plain text response',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const request: HttpRequest = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: {},
    }

    const result = await proxyFetch(request)

    expect(result.data).toBe('plain text response')
  })

  it('should throw ProxyFetchError when proxy endpoint fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Missing URL' }),
    })

    const request: HttpRequest = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: {},
    }

    try {
      await proxyFetch(request)
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ProxyFetchError)
      expect((error as Error).message).toBe('Missing URL')
    }
  })

  it('should throw ProxyFetchError when proxied request returns 4xx/5xx', async () => {
    const mockProxyResponse = {
      status: 401,
      headers: {},
      body: '{"error": "invalid_client", "error_description": "Client not found"}',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const request: HttpRequest = {
      method: 'POST',
      url: 'https://auth.example.com/token',
      headers: {},
    }

    try {
      await proxyFetch(request)
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ProxyFetchError)
      expect((error as Error).message).toBe('invalid_client: Client not found')
    }
  })

  it('should include exchange in ProxyFetchError for proxy endpoint failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Invalid URL format' }),
    })

    const request: HttpRequest = {
      method: 'GET',
      url: 'not-a-url',
      headers: {},
    }

    try {
      await proxyFetch(request)
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ProxyFetchError)
      const proxyError = error as ProxyFetchError
      expect(proxyError.exchange.request).toBe(request)
      expect(proxyError.exchange.error).toBe('Invalid URL format')
    }
  })

  it('should include exchange with response in ProxyFetchError for failed proxied request', async () => {
    const mockProxyResponse = {
      status: 404,
      headers: { 'content-type': 'application/json' },
      body: '{"error": "not_found"}',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const request: HttpRequest = {
      method: 'GET',
      url: 'https://example.com/missing',
      headers: {},
    }

    try {
      await proxyFetch(request)
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ProxyFetchError)
      const proxyError = error as ProxyFetchError
      expect(proxyError.exchange.request).toBe(request)
      expect(proxyError.exchange.response).toBeDefined()
      expect(proxyError.exchange.response?.status).toBe(404)
    }
  })

  it('should throw ProxyFetchError on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const request: HttpRequest = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: {},
    }

    try {
      await proxyFetch(request)
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ProxyFetchError)
      expect((error as Error).message).toBe('Network error')
    }
  })

  it('should handle empty headers in request', async () => {
    const mockProxyResponse = {
      status: 200,
      headers: {},
      body: '{}',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const request: HttpRequest = {
      method: 'GET',
      url: 'https://example.com/api',
    } as HttpRequest // headers undefined

    const result = await proxyFetch(request)

    expect(result.response.status).toBe(200)
  })

  it('should pass body through to proxy', async () => {
    const mockProxyResponse = {
      status: 201,
      headers: {},
      body: '{"created": true}',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProxyResponse),
    })

    const requestBody = 'grant_type=authorization_code&code=abc123'
    const request: HttpRequest = {
      method: 'POST',
      url: 'https://auth.example.com/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: requestBody,
    }

    await proxyFetch(request)

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.body).toBe(requestBody)
  })
})

describe('ProxyFetchError', () => {
  it('should have correct name and message', () => {
    const exchange = {
      request: { method: 'GET', url: 'https://example.com', headers: {} },
      timestamp: Date.now(),
      error: 'Test error',
    }

    const error = new ProxyFetchError('Something went wrong', exchange)

    expect(error.name).toBe('ProxyFetchError')
    expect(error.message).toBe('Something went wrong')
    expect(error.exchange).toBe(exchange)
  })

  it('should be instanceof Error', () => {
    const exchange = {
      request: { method: 'GET', url: 'https://example.com', headers: {} },
      timestamp: Date.now(),
    }

    const error = new ProxyFetchError('Test', exchange)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ProxyFetchError)
  })
})
