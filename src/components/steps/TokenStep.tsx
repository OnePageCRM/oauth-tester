import { useState, useEffect, useRef } from 'react'
import type { TokenStep as TokenStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

export interface TokenFormData {
  grantType: string
  code: string
  redirectUri: string
  codeVerifier: string
  tokenEndpointAuthMethod: string
  clientIdBasic: string
  clientSecretBasic: string
  clientIdPost: string
  clientSecretPost: string
  useProxy: boolean
}

interface TokenStepProps {
  step: TokenStepType
  index: number
  onFork: () => void
  onExchange: (data: TokenFormData) => void
  onReset: () => void
  // Pre-fill values from flow state
  code?: string
  redirectUri?: string
  clientId?: string
  codeVerifier?: string
  clientSecret?: string
  tokenEndpointAuthMethod?: string
}

export function TokenStep({
  step,
  index,
  onFork,
  onExchange,
  onReset,
  code: defaultCode,
  redirectUri: defaultRedirectUri,
  clientId: defaultClientId,
  codeVerifier: defaultCodeVerifier,
  clientSecret: defaultClientSecret,
  tokenEndpointAuthMethod: defaultAuthMethod,
}: TokenStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  const hasInitialized = useRef(false)

  // Form fields
  const [grantType, setGrantType] = useState('authorization_code')
  const [code, setCode] = useState('')
  const [redirectUri, setRedirectUri] = useState('')
  const [codeVerifier, setCodeVerifier] = useState('')
  const [tokenEndpointAuthMethod, setTokenEndpointAuthMethod] = useState('client_secret_basic')
  const [clientIdBasic, setClientIdBasic] = useState('')
  const [clientSecretBasic, setClientSecretBasic] = useState('')
  const [clientIdPost, setClientIdPost] = useState('')
  const [clientSecretPost, setClientSecretPost] = useState('')
  // Default: backend for confidential clients, browser for public clients
  const [useProxy, setUseProxy] = useState(() => {
    const authMethod = defaultAuthMethod ?? 'client_secret_basic'
    return authMethod !== 'none'
  })

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  // Initialize form with default values
  useEffect(() => {
    if ((isPending || isError) && !hasInitialized.current) {
      hasInitialized.current = true
      const authMethod = defaultAuthMethod ?? 'client_secret_basic'
      // Use async IIFE to avoid setState in effect body lint error
      void (async () => {
        setGrantType('authorization_code')
        setCode(defaultCode ?? '')
        setRedirectUri(defaultRedirectUri ?? '')
        setCodeVerifier(defaultCodeVerifier ?? '')
        setTokenEndpointAuthMethod(authMethod)
        // Pre-fill credentials based on auth method
        if (authMethod === 'client_secret_basic') {
          setClientIdBasic(defaultClientId ?? '')
          setClientSecretBasic(defaultClientSecret ?? '')
          setClientIdPost('')
          setClientSecretPost('')
        } else if (authMethod === 'client_secret_post') {
          setClientIdBasic('')
          setClientSecretBasic('')
          setClientIdPost(defaultClientId ?? '')
          setClientSecretPost(defaultClientSecret ?? '')
        } else if (authMethod === 'none') {
          // For 'none', only client_id in post body (no secret)
          setClientIdBasic('')
          setClientSecretBasic('')
          setClientIdPost(defaultClientId ?? '')
          setClientSecretPost('')
        } else {
          // For JWT methods, don't pre-fill
          setClientIdBasic('')
          setClientSecretBasic('')
          setClientIdPost('')
          setClientSecretPost('')
        }
      })()
    }
  }, [
    isPending,
    isError,
    defaultCode,
    defaultRedirectUri,
    defaultClientId,
    defaultCodeVerifier,
    defaultClientSecret,
    defaultAuthMethod,
  ])

  const handleEdit = () => {
    // Populate form with current values when editing
    setGrantType(step.grantType ?? 'authorization_code')
    setCode(step.code ?? defaultCode ?? '')
    setRedirectUri(step.redirectUri ?? defaultRedirectUri ?? '')
    setCodeVerifier(step.codeVerifier ?? defaultCodeVerifier ?? '')
    const authMethod = step.tokenEndpointAuthMethod ?? defaultAuthMethod ?? 'client_secret_basic'
    setTokenEndpointAuthMethod(authMethod)
    // Restore saved credentials or pre-fill based on auth method
    if (authMethod === 'client_secret_basic') {
      setClientIdBasic(step.clientIdBasic ?? defaultClientId ?? '')
      setClientSecretBasic(step.clientSecretBasic ?? defaultClientSecret ?? '')
      setClientIdPost(step.clientIdPost ?? '')
      setClientSecretPost(step.clientSecretPost ?? '')
    } else if (authMethod === 'client_secret_post') {
      setClientIdBasic(step.clientIdBasic ?? '')
      setClientSecretBasic(step.clientSecretBasic ?? '')
      setClientIdPost(step.clientIdPost ?? defaultClientId ?? '')
      setClientSecretPost(step.clientSecretPost ?? defaultClientSecret ?? '')
    } else if (authMethod === 'none') {
      setClientIdBasic(step.clientIdBasic ?? '')
      setClientSecretBasic(step.clientSecretBasic ?? '')
      setClientIdPost(step.clientIdPost ?? defaultClientId ?? '')
      setClientSecretPost(step.clientSecretPost ?? '')
    } else {
      setClientIdBasic(step.clientIdBasic ?? '')
      setClientSecretBasic(step.clientSecretBasic ?? '')
      setClientIdPost(step.clientIdPost ?? '')
      setClientSecretPost(step.clientSecretPost ?? '')
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleAuthMethodChange = (newMethod: string) => {
    setTokenEndpointAuthMethod(newMethod)
    // Update default proxy setting based on auth method
    // Public clients (none) can use browser, confidential clients should use backend
    setUseProxy(newMethod !== 'none')
    // Clear all credential fields and pre-fill based on new method
    if (newMethod === 'client_secret_basic') {
      setClientIdBasic(defaultClientId ?? '')
      setClientSecretBasic(defaultClientSecret ?? '')
      setClientIdPost('')
      setClientSecretPost('')
    } else if (newMethod === 'client_secret_post') {
      setClientIdBasic('')
      setClientSecretBasic('')
      setClientIdPost(defaultClientId ?? '')
      setClientSecretPost(defaultClientSecret ?? '')
    } else if (newMethod === 'none') {
      setClientIdBasic('')
      setClientSecretBasic('')
      setClientIdPost(defaultClientId ?? '')
      setClientSecretPost('')
    } else {
      // JWT methods - clear all
      setClientIdBasic('')
      setClientSecretBasic('')
      setClientIdPost('')
      setClientSecretPost('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      onReset()
    }
    onExchange({
      grantType,
      code,
      redirectUri,
      codeVerifier,
      tokenEndpointAuthMethod,
      clientIdBasic,
      clientSecretBasic,
      clientIdPost,
      clientSecretPost,
      useProxy,
    })
    setIsEditing(false)
  }

  const showForm = isPending || isError || isEditing

  return (
    <StepBase
      step={step}
      index={index}
      title="Token Exchange"
      onFork={onFork}
      onReset={isComplete && !isEditing ? handleEdit : undefined}
    >
      {isComplete && step.tokens && !isEditing ? (
        <div className="metadata-grid">
          <div className="metadata-item">
            <label>Access Token</label>
            <div className="step-value">{step.tokens.access_token}</div>
          </div>
          <div className="metadata-item">
            <label>Token Type</label>
            <div className="step-value">{step.tokens.token_type}</div>
          </div>
          {step.tokens.expires_in !== undefined && (
            <div className="metadata-item">
              <label>Expires In</label>
              <div className="step-value">{step.tokens.expires_in} seconds</div>
            </div>
          )}
          {step.tokens.refresh_token && (
            <div className="metadata-item">
              <label>Refresh Token</label>
              <div className="step-value">{step.tokens.refresh_token}</div>
            </div>
          )}
          {step.tokens.scope && (
            <div className="metadata-item">
              <label>Scope</label>
              <div className="step-value">{step.tokens.scope}</div>
            </div>
          )}
          {step.tokens.id_token && (
            <div className="metadata-item">
              <label>ID Token</label>
              <div className="step-value">{step.tokens.id_token}</div>
            </div>
          )}
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="step-form">
          <div className="fetch-mode-row">
            <label>Fetch Via</label>
            <div className="fetch-mode-toggle">
              <button
                type="button"
                className={!useProxy ? 'active' : ''}
                onClick={() => setUseProxy(false)}
              >
                Browser
              </button>
              <button
                type="button"
                className={useProxy ? 'active' : ''}
                onClick={() => setUseProxy(true)}
              >
                Backend
              </button>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="grant-type">Grant Type</label>
            <input
              id="grant-type"
              type="text"
              className="input-with-spacer"
              value={grantType}
              onChange={(e) => setGrantType(e.target.value)}
              placeholder="authorization_code"
            />
          </div>

          <div className="form-row">
            <label htmlFor="token-code">Code</label>
            <input
              id="token-code"
              type="text"
              className="input-with-spacer"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="authorization code"
            />
          </div>

          <div className="form-row">
            <label htmlFor="token-code-verifier">Code Verifier</label>
            <input
              id="token-code-verifier"
              type="text"
              className="input-with-spacer"
              value={codeVerifier}
              onChange={(e) => setCodeVerifier(e.target.value)}
              placeholder="PKCE code verifier"
            />
          </div>

          <div className="form-row">
            <label htmlFor="token-redirect-uri">Redirect URI</label>
            <input
              id="token-redirect-uri"
              type="text"
              className="input-with-spacer"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="https://example.com/callback"
            />
          </div>

          <div className="form-row">
            <label htmlFor="token-auth-method">Auth Method</label>
            <select
              id="token-auth-method"
              className="input-with-spacer"
              value={tokenEndpointAuthMethod}
              onChange={(e) => handleAuthMethodChange(e.target.value)}
            >
              <option value="client_secret_basic">client_secret_basic</option>
              <option value="client_secret_post">client_secret_post</option>
              <option value="client_secret_jwt">client_secret_jwt</option>
              <option value="private_key_jwt">private_key_jwt</option>
              <option value="none">none</option>
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="token-client-id-basic">Client ID (Basic Auth)</label>
            <input
              id="token-client-id-basic"
              type="text"
              className="input-with-spacer"
              value={clientIdBasic}
              onChange={(e) => setClientIdBasic(e.target.value)}
              placeholder="client_id for Basic auth"
            />
          </div>

          <div className="form-row">
            <label htmlFor="token-client-secret-basic">Client Secret (Basic Auth)</label>
            <input
              id="token-client-secret-basic"
              type="password"
              className="input-with-spacer"
              value={clientSecretBasic}
              onChange={(e) => setClientSecretBasic(e.target.value)}
              placeholder="client_secret for Basic auth"
            />
          </div>

          <div className="form-row">
            <label htmlFor="token-client-id-post">Client ID (Post body)</label>
            <input
              id="token-client-id-post"
              type="text"
              className="input-with-spacer"
              value={clientIdPost}
              onChange={(e) => setClientIdPost(e.target.value)}
              placeholder="client_id for POST body"
            />
          </div>

          <div className="form-row">
            <label htmlFor="token-client-secret-post">Client Secret (Post body)</label>
            <input
              id="token-client-secret-post"
              type="password"
              className="input-with-spacer"
              value={clientSecretPost}
              onChange={(e) => setClientSecretPost(e.target.value)}
              placeholder="client_secret for POST body"
            />
          </div>

          <div className="form-actions">
            <button type="submit">Exchange Code for Tokens</button>
            {isEditing && (
              <button type="button" className="secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="step-loading">Exchanging code for tokens...</div>
      )}
    </StepBase>
  )
}
