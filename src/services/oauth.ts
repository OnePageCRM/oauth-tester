import type { ServerMetadata, HttpExchange, HttpRequest, HttpResponse } from '../types'

// Build a well-known URL for OAuth metadata discovery
export function buildDiscoveryUrl(serverUrl: string): string {
  const url = new URL(serverUrl)
  // OAuth 2.0 Authorization Server Metadata (RFC 8414)
  return `${url.origin}/.well-known/oauth-authorization-server${url.pathname === '/' ? '' : url.pathname}`
}

// Alternative: OpenID Connect Discovery
export function buildOIDCDiscoveryUrl(serverUrl: string): string {
  const url = new URL(serverUrl)
  const path = url.pathname === '/' ? '' : url.pathname
  return `${url.origin}${path}/.well-known/openid-configuration`
}

// Fetch with HTTP exchange capture
async function fetchWithCapture(
  request: HttpRequest
): Promise<{ response: HttpResponse; data: unknown; exchange: HttpExchange }> {
  const timestamp = Date.now()

  try {
    const fetchResponse = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })

    const responseBody = await fetchResponse.text()

    const response: HttpResponse = {
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      headers: Object.fromEntries(fetchResponse.headers.entries()),
      body: responseBody,
    }

    const exchange: HttpExchange = {
      request,
      response,
      timestamp,
    }

    let data: unknown
    try {
      data = JSON.parse(responseBody)
    } catch {
      data = responseBody
    }

    if (!fetchResponse.ok) {
      throw new FetchError(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`, exchange)
    }

    return { response, data, exchange }
  } catch (error) {
    if (error instanceof FetchError) {
      throw error
    }

    const exchange: HttpExchange = {
      request,
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    throw new FetchError(error instanceof Error ? error.message : 'Unknown error', exchange)
  }
}

export class FetchError extends Error {
  constructor(
    message: string,
    public exchange: HttpExchange
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

// Discover OAuth server metadata
export async function discoverMetadata(
  serverUrl: string
): Promise<{ metadata: ServerMetadata; exchange: HttpExchange }> {
  // Try OAuth 2.0 metadata first
  const oauthUrl = buildDiscoveryUrl(serverUrl)

  const request: HttpRequest = {
    method: 'GET',
    url: oauthUrl,
    headers: {
      Accept: 'application/json',
    },
  }

  try {
    const { data, exchange } = await fetchWithCapture(request)
    return { metadata: data as ServerMetadata, exchange }
  } catch (error) {
    // If OAuth metadata fails, try OIDC discovery
    if (error instanceof FetchError && error.exchange.response?.status === 404) {
      const oidcUrl = buildOIDCDiscoveryUrl(serverUrl)
      const oidcRequest: HttpRequest = {
        method: 'GET',
        url: oidcUrl,
        headers: {
          Accept: 'application/json',
        },
      }

      const { data, exchange } = await fetchWithCapture(oidcRequest)
      return { metadata: data as ServerMetadata, exchange }
    }

    throw error
  }
}
