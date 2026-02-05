// OAuth Server Metadata (from discovery)
export interface ServerMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint?: string
  introspection_endpoint?: string
  revocation_endpoint?: string
  scopes_supported?: string[]
  response_types_supported?: string[]
  grant_types_supported?: string[]
  code_challenge_methods_supported?: string[]
  [key: string]: unknown // Allow additional fields
}

// Client credentials (from registration or manual input)
export interface ClientCredentials {
  client_id: string
  client_secret?: string
  client_id_issued_at?: number
  client_secret_expires_at?: number
  redirect_uris?: string[]
  token_endpoint_auth_method?: string
  grant_types?: string[]
  response_types?: string[]
  client_name?: string
  client_uri?: string
  logo_uri?: string
  scope?: string
  contacts?: string[]
  tos_uri?: string
  policy_uri?: string
  jwks_uri?: string
  jwks?: Record<string, unknown>
  software_id?: string
  software_version?: string
  [key: string]: unknown // Allow additional server-specific fields
}

// Dynamic client registration request (RFC 7591)
export interface RegistrationRequest {
  // Required for redirect-based flows (can be undefined to not send)
  redirect_uris?: string[]
  // Optional fields
  token_endpoint_auth_method?: string
  grant_types?: string[]
  response_types?: string[]
  client_name?: string
  client_uri?: string
  logo_uri?: string
  scope?: string
  contacts?: string[]
  tos_uri?: string
  policy_uri?: string
  jwks_uri?: string
  jwks?: string // JSON string for the JWK Set
  software_id?: string
  software_version?: string
}

// PKCE state
export interface PKCEState {
  code_verifier: string
  code_challenge: string
  code_challenge_method: 'S256' | 'plain'
}

// Token response
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  id_token?: string
  [key: string]: unknown
}

// HTTP request/response for debugging
export interface HttpRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

export interface HttpExchange {
  request: HttpRequest
  response?: HttpResponse
  error?: string
  timestamp: number
}

// Step types
export type StepType =
  | 'start'
  | 'discovery'
  | 'registration'
  | 'authorization'
  | 'callback'
  | 'token'
  | 'refresh'
  | 'introspect'
  | 'revoke'

export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error'

// Base step with common fields
export interface BaseStep {
  id: string
  type: StepType
  status: StepStatus
  error?: string
  httpExchange?: HttpExchange
  completedAt?: number
}

// Step-specific data
export interface StartStep extends BaseStep {
  type: 'start'
  serverUrl?: string
}

export interface DiscoveryStep extends BaseStep {
  type: 'discovery'
  metadata?: ServerMetadata
}

export interface RegistrationStep extends BaseStep {
  type: 'registration'
  mode: 'dynamic' | 'manual'
  credentials?: ClientCredentials
}

export interface AuthorizationStep extends BaseStep {
  type: 'authorization'
  // Form values (editable)
  responseType?: string
  clientId?: string
  redirectUri?: string
  scope?: string
  state?: string
  codeChallenge?: string
  codeChallengeMethod?: string
  codeVerifier?: string // Stored for token exchange
  // Result
  authorizationUrl?: string
}

export interface CallbackStep extends BaseStep {
  type: 'callback'
  code?: string
  error?: string
  errorDescription?: string
}

export interface TokenStep extends BaseStep {
  type: 'token'
  tokens?: TokenResponse
}

export interface RefreshStep extends BaseStep {
  type: 'refresh'
  tokens?: TokenResponse
}

export interface IntrospectStep extends BaseStep {
  type: 'introspect'
  tokenInfo?: Record<string, unknown>
}

export interface RevokeStep extends BaseStep {
  type: 'revoke'
  revoked?: boolean
}

export type Step =
  | StartStep
  | DiscoveryStep
  | RegistrationStep
  | AuthorizationStep
  | CallbackStep
  | TokenStep
  | RefreshStep
  | IntrospectStep
  | RevokeStep

// Flow - collection of steps with state
export interface Flow {
  id: string
  name: string
  createdAt: number
  lastModified: number
  parentFlowId?: string // If forked
  parentStepIndex?: number // Fork point

  steps: Step[]

  // Accumulated state (updated as steps complete)
  serverUrl?: string
  metadata?: ServerMetadata
  credentials?: ClientCredentials
  tokens?: TokenResponse
}

// App state
export interface AppState {
  flows: Flow[]
  activeFlowId: string | null
}
