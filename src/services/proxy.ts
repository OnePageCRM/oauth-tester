import type { HttpRequest, HttpResponse, HttpExchange } from '../types'

interface ProxyRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

interface ProxyResponse {
  status: number
  headers: Record<string, string>
  body: string
}

interface ProxyError {
  error: string
}

// Get the proxy endpoint URL
function getProxyUrl(): string {
  return `${window.location.origin}/api/proxy`
}

// Make a request through the backend proxy to bypass CORS
export async function proxyFetch(
  request: HttpRequest
): Promise<{ response: HttpResponse; data: unknown; exchange: HttpExchange }> {
  const timestamp = Date.now()

  const proxyRequest: ProxyRequest = {
    url: request.url,
    method: request.method,
    headers: request.headers || {},
    body: request.body,
  }

  try {
    const proxyResponse = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyRequest),
    })

    if (!proxyResponse.ok) {
      // Proxy endpoint itself failed
      const errorData = (await proxyResponse.json()) as ProxyError
      const errorMessage = errorData.error || `Proxy error: ${proxyResponse.status}`
      const exchange: HttpExchange = {
        request,
        timestamp,
        error: errorMessage,
      }
      throw new ProxyFetchError(errorMessage, exchange)
    }

    const proxyResult = (await proxyResponse.json()) as ProxyResponse

    // Build the response as if it came directly from the target
    const response: HttpResponse = {
      status: proxyResult.status,
      statusText: getStatusText(proxyResult.status),
      headers: proxyResult.headers,
      body: proxyResult.body,
    }

    const exchange: HttpExchange = {
      request,
      response,
      timestamp,
    }

    // Parse response body as JSON if possible
    let data: unknown
    try {
      data = JSON.parse(proxyResult.body)
    } catch {
      data = proxyResult.body
    }

    // Check if the proxied request was successful
    if (proxyResult.status >= 400) {
      const errorMessage = formatErrorMessage(proxyResult.status, response.statusText, data)
      throw new ProxyFetchError(errorMessage, exchange)
    }

    return { response, data, exchange }
  } catch (error) {
    if (error instanceof ProxyFetchError) {
      throw error
    }

    // Network error reaching the proxy itself
    const errorMessage = error instanceof Error ? error.message : 'Failed to reach proxy server'

    const exchange: HttpExchange = {
      request,
      timestamp,
      error: errorMessage,
    }

    throw new ProxyFetchError(errorMessage, exchange)
  }
}

export class ProxyFetchError extends Error {
  constructor(
    message: string,
    public exchange: HttpExchange
  ) {
    super(message)
    this.name = 'ProxyFetchError'
  }
}

// Format error message from OAuth error response
function formatErrorMessage(status: number, statusText: string, data: unknown): string {
  if (data && typeof data === 'object') {
    const errorData = data as Record<string, unknown>
    if (errorData.error) {
      const error = String(errorData.error)
      const description = errorData.error_description
        ? String(errorData.error_description)
        : undefined
      return description ? `${error}: ${description}` : error
    }
    if (errorData.message) {
      return String(errorData.message)
    }
  }
  return `HTTP ${status}: ${statusText}`
}

// Get status text for common HTTP status codes
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  }
  return statusTexts[status] || 'Unknown'
}
