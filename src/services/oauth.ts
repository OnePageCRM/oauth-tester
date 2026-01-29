import type {
  ServerMetadata,
  HttpExchange,
  HttpRequest,
  HttpResponse,
  ClientCredentials,
  RegistrationRequest,
  PKCEState,
  TokenResponse,
} from '../types'

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

// Format error message from OAuth error response or HTTP error
function formatErrorMessage(status: number, statusText: string, data: unknown): string {
  // Check for OAuth error response format (RFC 6749)
  if (data && typeof data === 'object') {
    const errorData = data as Record<string, unknown>
    if (errorData.error) {
      const error = String(errorData.error)
      const description = errorData.error_description
        ? String(errorData.error_description)
        : undefined
      return description ? `${error}: ${description}` : error
    }
    // Some servers return { message: "..." }
    if (errorData.message) {
      return String(errorData.message)
    }
  }
  return `HTTP ${status}: ${statusText}`
}

// Check if URL is cross-origin
function isCrossOrigin(url: string): boolean {
  try {
    const targetUrl = new URL(url)
    return targetUrl.origin !== window.location.origin
  } catch {
    return false
  }
}

// Format network error with more details
function formatNetworkError(error: Error, requestUrl: string): string {
  const message = error.message || 'Unknown error'

  // Provide more context for common errors
  if (message === 'Failed to fetch' || message.includes('NetworkError')) {
    const crossOrigin = isCrossOrigin(requestUrl)
    if (crossOrigin) {
      try {
        const target = new URL(requestUrl)
        return `Failed to fetch: CORS error - server at ${target.origin} must include 'Access-Control-Allow-Origin' header`
      } catch {
        return 'Failed to fetch: CORS error - server must include Access-Control-Allow-Origin header'
      }
    }
    return 'Failed to fetch: Server unreachable or connection refused'
  }

  if (message.includes('CORS')) {
    return `Failed to fetch: ${message}`
  }

  return message
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
      const errorMessage = formatErrorMessage(fetchResponse.status, fetchResponse.statusText, data)
      throw new FetchError(errorMessage, exchange)
    }

    return { response, data, exchange }
  } catch (error) {
    if (error instanceof FetchError) {
      throw error
    }

    const errorMessage = formatNetworkError(
      error instanceof Error ? error : new Error('Unknown error'),
      request.url
    )

    const exchange: HttpExchange = {
      request,
      timestamp,
      error: errorMessage,
    }

    throw new FetchError(errorMessage, exchange)
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

// Get the callback URL for this app
export function getCallbackUrl(): string {
  return `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/callback.html`
}

// Get default registration request
export function getDefaultRegistrationRequest(): RegistrationRequest {
  return {
    redirect_uris: [getCallbackUrl()],
    client_name: 'OAuth Tester',
    token_endpoint_auth_method: 'client_secret_basic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  }
}

// Dynamic client registration (RFC 7591)
export async function registerClient(
  registrationEndpoint: string,
  registrationRequest: RegistrationRequest
): Promise<{ credentials: ClientCredentials; exchange: HttpExchange }> {
  // Filter out empty optional fields
  const requestBody: Record<string, unknown> = {
    redirect_uris: registrationRequest.redirect_uris,
  }

  if (registrationRequest.client_name) {
    requestBody.client_name = registrationRequest.client_name
  }
  if (registrationRequest.token_endpoint_auth_method) {
    requestBody.token_endpoint_auth_method = registrationRequest.token_endpoint_auth_method
  }
  if (registrationRequest.grant_types?.length) {
    requestBody.grant_types = registrationRequest.grant_types
  }
  if (registrationRequest.response_types?.length) {
    requestBody.response_types = registrationRequest.response_types
  }
  if (registrationRequest.scope) {
    requestBody.scope = registrationRequest.scope
  }
  if (registrationRequest.contacts?.length) {
    requestBody.contacts = registrationRequest.contacts
  }
  if (registrationRequest.client_uri) {
    requestBody.client_uri = registrationRequest.client_uri
  }
  if (registrationRequest.logo_uri) {
    requestBody.logo_uri = registrationRequest.logo_uri
  }
  if (registrationRequest.tos_uri) {
    requestBody.tos_uri = registrationRequest.tos_uri
  }
  if (registrationRequest.policy_uri) {
    requestBody.policy_uri = registrationRequest.policy_uri
  }

  const request: HttpRequest = {
    method: 'POST',
    url: registrationEndpoint,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  }

  const { data, exchange } = await fetchWithCapture(request)

  const responseData = data as Record<string, unknown>

  if (!responseData.client_id) {
    throw new FetchError('Registration response missing client_id', exchange)
  }

  const credentials: ClientCredentials = {
    client_id: responseData.client_id as string,
    client_secret: responseData.client_secret as string | undefined,
    redirect_uris: responseData.redirect_uris as string[] | undefined,
  }

  return { credentials, exchange }
}

// Build authorization URL for OAuth 2.1
export interface AuthorizationParams {
  authorizationEndpoint: string
  clientId: string
  redirectUri: string
  scope: string
  state: string
  pkce: PKCEState
}

export function buildAuthorizationUrl(params: AuthorizationParams): string {
  const url = new URL(params.authorizationEndpoint)

  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', params.scope)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.pkce.code_challenge)
  url.searchParams.set('code_challenge_method', params.pkce.code_challenge_method)

  return url.toString()
}

// Token exchange parameters
export interface TokenExchangeParams {
  tokenEndpoint: string
  code: string
  redirectUri: string
  clientId: string
  clientSecret?: string
  codeVerifier: string
}

// Exchange authorization code for tokens
export async function exchangeToken(
  params: TokenExchangeParams
): Promise<{ tokens: TokenResponse; exchange: HttpExchange }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  })

  // Build headers - use Basic auth if client_secret is provided
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  }

  if (params.clientSecret) {
    const credentials = btoa(`${params.clientId}:${params.clientSecret}`)
    headers['Authorization'] = `Basic ${credentials}`
  }

  const request: HttpRequest = {
    method: 'POST',
    url: params.tokenEndpoint,
    headers,
    body: body.toString(),
  }

  const { data, exchange } = await fetchWithCapture(request)

  const tokens = data as TokenResponse

  if (!tokens.access_token) {
    throw new FetchError('Token response missing access_token', exchange)
  }

  return { tokens, exchange }
}
