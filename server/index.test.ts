// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from './index'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('POST /api/proxy', () => {
  const app = createApp()

  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validation', () => {
    it('should return 400 when url is missing', async () => {
      const response = await request(app).post('/api/proxy').send({})

      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Missing or invalid "url" field' })
    })

    it('should return 400 when url is not a string', async () => {
      const response = await request(app).post('/api/proxy').send({ url: 123 })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Missing or invalid "url" field' })
    })

    it('should return 400 when url is empty string', async () => {
      const response = await request(app).post('/api/proxy').send({ url: '' })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Missing or invalid "url" field' })
    })

    it('should return 400 for invalid URL format', async () => {
      const response = await request(app).post('/api/proxy').send({ url: 'not-a-valid-url' })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Invalid URL format' })
    })

    it('should allow any HTTP URL', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"ok": true}'),
      })

      const response = await request(app).post('/api/proxy').send({ url: 'http://example.com/api' })

      expect(response.status).toBe(200)
    })

    it('should allow HTTPS URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"ok": true}'),
      })

      const response = await request(app)
        .post('/api/proxy')
        .send({ url: 'https://example.com/api' })

      expect(response.status).toBe(200)
    })
  })

  describe('proxying requests', () => {
    it('should forward GET request to target URL', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"data": "test"}'),
      })

      await request(app).post('/api/proxy').send({
        url: 'https://api.example.com/resource',
        method: 'GET',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/resource', {
        method: 'GET',
        headers: {},
        body: undefined,
      })
    })

    it('should forward POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 201,
        headers: new Map(),
        text: () => Promise.resolve('{"created": true}'),
      })

      await request(app)
        .post('/api/proxy')
        .send({
          url: 'https://api.example.com/resource',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"name": "test"}',
        })

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "test"}',
      })
    })

    it('should default method to GET when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(''),
      })

      await request(app).post('/api/proxy').send({
        url: 'https://api.example.com/resource',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/resource', {
        method: 'GET',
        headers: {},
        body: undefined,
      })
    })

    it('should forward custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(''),
      })

      await request(app)
        .post('/api/proxy')
        .send({
          url: 'https://api.example.com/resource',
          method: 'GET',
          headers: {
            Authorization: 'Bearer token123',
            Accept: 'application/json',
          },
        })

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/resource', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token123',
          Accept: 'application/json',
        },
        body: undefined,
      })
    })
  })

  describe('response handling', () => {
    it('should return status, headers, and body from target', async () => {
      const mockHeaders = new Map([
        ['content-type', 'application/json'],
        ['x-custom-header', 'custom-value'],
      ])

      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: {
          forEach: (cb: (value: string, key: string) => void) => mockHeaders.forEach(cb),
        },
        text: () => Promise.resolve('{"result": "success"}'),
      })

      const response = await request(app)
        .post('/api/proxy')
        .send({ url: 'https://api.example.com/resource' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        },
        body: '{"result": "success"}',
      })
    })

    it('should return 4xx status from target without error', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        text: () => Promise.resolve('{"error": "not_found"}'),
      })

      const response = await request(app)
        .post('/api/proxy')
        .send({ url: 'https://api.example.com/missing' })

      // Proxy returns 200 with the target's 404 in the body
      expect(response.status).toBe(200)
      expect(response.body.status).toBe(404)
      expect(response.body.body).toBe('{"error": "not_found"}')
    })

    it('should return 5xx status from target without error', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 500,
        headers: new Map(),
        text: () => Promise.resolve('Internal Server Error'),
      })

      const response = await request(app)
        .post('/api/proxy')
        .send({ url: 'https://api.example.com/error' })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe(500)
      expect(response.body.body).toBe('Internal Server Error')
    })
  })

  describe('error handling', () => {
    it('should return 502 when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const response = await request(app)
        .post('/api/proxy')
        .send({ url: 'https://unreachable.example.com/api' })

      expect(response.status).toBe(502)
      expect(response.body).toEqual({ error: 'Proxy request failed: Connection refused' })
    })

    it('should return 502 with generic message for non-Error rejection', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      const response = await request(app)
        .post('/api/proxy')
        .send({ url: 'https://unreachable.example.com/api' })

      expect(response.status).toBe(502)
      expect(response.body).toEqual({ error: 'Proxy request failed: Unknown error' })
    })

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network timeout'))

      const response = await request(app)
        .post('/api/proxy')
        .send({ url: 'https://slow.example.com/api' })

      expect(response.status).toBe(502)
      expect(response.body.error).toContain('network timeout')
    })
  })
})
