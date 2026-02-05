import { useState, useEffect, useRef } from 'react'
import type { RefreshStep as RefreshStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

export interface RefreshFormData {
  grantType: string
  refreshToken: string
  scope: string
  tokenEndpointAuthMethod: string
  clientIdBasic: string
  clientSecretBasic: string
  clientIdPost: string
  clientSecretPost: string
}

interface RefreshStepProps {
  step: RefreshStepType
  index: number
  onFork: () => void
  onRefresh: (data: RefreshFormData) => void
  onReset: () => void
  // Pre-fill values from flow state
  refreshToken?: string
  clientId?: string
  clientSecret?: string
  tokenEndpointAuthMethod?: string
}

export function RefreshStep({
  step,
  index,
  onFork,
  onRefresh,
  onReset,
  refreshToken: defaultRefreshToken,
  clientId: defaultClientId,
  clientSecret: defaultClientSecret,
  tokenEndpointAuthMethod: defaultAuthMethod,
}: RefreshStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  const hasInitialized = useRef(false)

  // Form fields
  const [grantType, setGrantType] = useState('refresh_token')
  const [refreshToken, setRefreshToken] = useState('')
  const [scope, setScope] = useState('')
  const [tokenEndpointAuthMethod, setTokenEndpointAuthMethod] = useState('client_secret_basic')
  const [clientIdBasic, setClientIdBasic] = useState('')
  const [clientSecretBasic, setClientSecretBasic] = useState('')
  const [clientIdPost, setClientIdPost] = useState('')
  const [clientSecretPost, setClientSecretPost] = useState('')

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
        setGrantType('refresh_token')
        setRefreshToken(defaultRefreshToken ?? '')
        setScope('')
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
          setClientIdBasic('')
          setClientSecretBasic('')
          setClientIdPost(defaultClientId ?? '')
          setClientSecretPost('')
        } else {
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
    defaultRefreshToken,
    defaultClientId,
    defaultClientSecret,
    defaultAuthMethod,
  ])

  // Update refresh token when it becomes available (e.g., after token exchange)
  useEffect(() => {
    if ((isPending || isError) && defaultRefreshToken && !refreshToken) {
      void (async () => {
        setRefreshToken(defaultRefreshToken)
      })()
    }
  }, [isPending, isError, defaultRefreshToken, refreshToken])

  // Update credentials when they become available
  useEffect(() => {
    if ((isPending || isError) && defaultClientId && !clientIdBasic && !clientIdPost) {
      const authMethod = defaultAuthMethod ?? 'client_secret_basic'
      void (async () => {
        if (authMethod === 'client_secret_basic') {
          setClientIdBasic(defaultClientId)
          if (defaultClientSecret) setClientSecretBasic(defaultClientSecret)
        } else if (authMethod === 'client_secret_post' || authMethod === 'none') {
          setClientIdPost(defaultClientId)
          if (authMethod === 'client_secret_post' && defaultClientSecret) {
            setClientSecretPost(defaultClientSecret)
          }
        }
      })()
    }
  }, [
    isPending,
    isError,
    defaultClientId,
    defaultClientSecret,
    defaultAuthMethod,
    clientIdBasic,
    clientIdPost,
  ])

  const handleEdit = () => {
    setGrantType(step.grantType ?? 'refresh_token')
    setRefreshToken(step.refreshToken ?? defaultRefreshToken ?? '')
    setScope(step.scope ?? '')
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
    onRefresh({
      grantType,
      refreshToken,
      scope,
      tokenEndpointAuthMethod,
      clientIdBasic,
      clientSecretBasic,
      clientIdPost,
      clientSecretPost,
    })
    setIsEditing(false)
  }

  const showForm = isPending || isError || isEditing
  const hasRefreshToken = !!defaultRefreshToken || !!refreshToken

  return (
    <StepBase
      step={step}
      index={index}
      title="Token Refresh"
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
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="step-form">
          <div className="form-row">
            <label htmlFor="refresh-grant-type">Grant Type</label>
            <input
              id="refresh-grant-type"
              type="text"
              className="input-with-spacer"
              value={grantType}
              onChange={(e) => setGrantType(e.target.value)}
              placeholder="refresh_token"
            />
          </div>

          <div className="form-row">
            <label htmlFor="refresh-token">Refresh Token</label>
            <input
              id="refresh-token"
              type="text"
              className="input-with-spacer"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="refresh token"
            />
          </div>

          <div className="form-row">
            <label htmlFor="refresh-scope">Scope</label>
            <input
              id="refresh-scope"
              type="text"
              className="input-with-spacer"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="optional - request narrower scope"
            />
          </div>

          <div className="form-row">
            <label htmlFor="refresh-auth-method">Auth Method</label>
            <select
              id="refresh-auth-method"
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
            <label htmlFor="refresh-client-id-basic">Client ID (Basic Auth)</label>
            <input
              id="refresh-client-id-basic"
              type="text"
              className="input-with-spacer"
              value={clientIdBasic}
              onChange={(e) => setClientIdBasic(e.target.value)}
              placeholder="client_id for Basic auth"
            />
          </div>

          <div className="form-row">
            <label htmlFor="refresh-client-secret-basic">Client Secret (Basic Auth)</label>
            <input
              id="refresh-client-secret-basic"
              type="password"
              className="input-with-spacer"
              value={clientSecretBasic}
              onChange={(e) => setClientSecretBasic(e.target.value)}
              placeholder="client_secret for Basic auth"
            />
          </div>

          <div className="form-row">
            <label htmlFor="refresh-client-id-post">Client ID (Post body)</label>
            <input
              id="refresh-client-id-post"
              type="text"
              className="input-with-spacer"
              value={clientIdPost}
              onChange={(e) => setClientIdPost(e.target.value)}
              placeholder="client_id for POST body"
            />
          </div>

          <div className="form-row">
            <label htmlFor="refresh-client-secret-post">Client Secret (Post body)</label>
            <input
              id="refresh-client-secret-post"
              type="password"
              className="input-with-spacer"
              value={clientSecretPost}
              onChange={(e) => setClientSecretPost(e.target.value)}
              placeholder="client_secret for POST body"
            />
          </div>

          <div className="form-actions">
            {!hasRefreshToken ? (
              <p className="step-warning">No refresh token available.</p>
            ) : (
              <button type="submit">Refresh Tokens</button>
            )}
            {isEditing && (
              <button type="button" className="secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="step-loading">Refreshing tokens...</div>
      )}
    </StepBase>
  )
}
