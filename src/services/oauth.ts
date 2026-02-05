import type {
  ServerMetadata,
  HttpExchange,
  HttpRequest,
  HttpResponse,
  ClientCredentials,
  RegistrationRequest,
  TokenResponse,
} from '../types'
import { proxyFetch, ProxyFetchError } from './proxy'

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

// Process field value: empty string = skip, single space = send empty string, otherwise send value
function processStringField(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  if (value === ' ') return ''
  return value
}

// Process array field: filter empty items, single space item = empty string
// - undefined → undefined (no inputs, don't send field)
// - [''] → [] (empty input, send empty array)
// - [' '] → [''] (space input, send array with empty string)
// - ['value'] → ['value']
function processArrayField(values: string[] | undefined): string[] | undefined {
  if (values === undefined) return undefined // No inputs - don't send
  const processed = values.filter((v) => v !== '').map((v) => (v === ' ' ? '' : v))
  return processed // Return [] if all were empty (send empty array)
}

// Dynamic client registration (RFC 7591)
export async function registerClient(
  registrationEndpoint: string,
  registrationRequest: RegistrationRequest
): Promise<{ credentials: ClientCredentials; exchange: HttpExchange }> {
  const requestBody: Record<string, unknown> = {}

  // redirect_uris - required for redirect-based flows
  const redirectUris = processArrayField(registrationRequest.redirect_uris)
  if (redirectUris) {
    requestBody.redirect_uris = redirectUris
  }

  // String fields
  const stringFields = [
    'token_endpoint_auth_method',
    'client_name',
    'client_uri',
    'logo_uri',
    'scope',
    'tos_uri',
    'policy_uri',
    'jwks_uri',
    'software_id',
    'software_version',
  ] as const

  for (const field of stringFields) {
    const value = processStringField(registrationRequest[field])
    if (value !== undefined) {
      requestBody[field] = value
    }
  }

  // Array fields
  const grantTypes = processArrayField(registrationRequest.grant_types)
  if (grantTypes) requestBody.grant_types = grantTypes

  const responseTypes = processArrayField(registrationRequest.response_types)
  if (responseTypes) requestBody.response_types = responseTypes

  const contacts = processArrayField(registrationRequest.contacts)
  if (contacts) requestBody.contacts = contacts

  // JWKS - parse JSON string if provided
  if (registrationRequest.jwks) {
    const jwksValue = processStringField(registrationRequest.jwks)
    if (jwksValue !== undefined) {
      try {
        requestBody.jwks = jwksValue === '' ? '' : JSON.parse(jwksValue)
      } catch {
        requestBody.jwks = jwksValue // Send as-is if not valid JSON
      }
    }
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

  // Use proxy for registration - CORS not allowed on registration endpoints
  const { data, exchange } = await proxyFetch(request)

  const responseData = data as Record<string, unknown>

  if (!responseData.client_id) {
    throw new ProxyFetchError('Registration response missing client_id', exchange)
  }

  // Capture all fields from registration response
  const credentials: ClientCredentials = {
    ...responseData,
    client_id: responseData.client_id as string,
  }

  return { credentials, exchange }
}

// Build authorization URL for OAuth 2.1
export interface AuthorizationParams {
  authorizationEndpoint: string
  responseType: string
  clientId: string
  redirectUri: string
  scope: string // Empty string = omit, single space = send empty
  state: string
  codeChallenge: string
  codeChallengeMethod: string
}

export function buildAuthorizationUrl(params: AuthorizationParams): string {
  const url = new URL(params.authorizationEndpoint)

  url.searchParams.set('response_type', params.responseType)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)

  // Scope: empty string = omit, single space = send empty string
  const scopeValue = processStringField(params.scope)
  if (scopeValue !== undefined) {
    url.searchParams.set('scope', scopeValue)
  }

  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', params.codeChallengeMethod)

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

  // Use proxy for token exchange - CORS may not be allowed depending on client type
  const { data, exchange } = await proxyFetch(request)

  const tokens = data as TokenResponse

  if (!tokens.access_token) {
    throw new ProxyFetchError('Token response missing access_token', exchange)
  }

  return { tokens, exchange }
}
