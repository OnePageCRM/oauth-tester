import type {
  ServerMetadata,
  HttpExchange,
  HttpRequest,
  HttpResponse,
  ClientCredentials,
  RegistrationRequest,
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
