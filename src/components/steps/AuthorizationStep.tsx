import { useState, useEffect, useRef, useCallback } from 'react'
import type { AuthorizationStep as AuthorizationStepType } from '../../types'
import { generatePKCE, generateState } from '../../services/pkce'
import { getCallbackUrl } from '../../services/oauth'
import { StepBase } from './StepBase'
import './StepForms.css'

export interface AuthorizationFormData {
  responseType: string
  clientId: string
  redirectUri: string
  scope: string
  state: string
  codeChallenge: string
  codeChallengeMethod: string
  codeVerifier: string
}

interface AuthorizationStepProps {
  step: AuthorizationStepType
  index: number
  onFork: () => void
  onAuthorize: (data: AuthorizationFormData) => void
  onReset: () => void
  clientId?: string
  supportedScopes?: string[]
}

export function AuthorizationStep({
  step,
  index,
  onFork,
  onAuthorize,
  onReset,
  clientId,
  supportedScopes,
}: AuthorizationStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(true) // Start as generating
  const hasGeneratedRef = useRef(false)

  // Form fields
  const [responseType, setResponseType] = useState('code')
  const [formClientId, setFormClientId] = useState('')
  const [redirectUri, setRedirectUri] = useState('')
  const [scope, setScope] = useState('')
  const [state, setState] = useState('')
  const [codeChallenge, setCodeChallenge] = useState('')
  const [codeChallengeMethod, setCodeChallengeMethod] = useState('S256')
  const [codeVerifier, setCodeVerifier] = useState('')

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  const generateDefaults = useCallback(async () => {
    const pkce = await generatePKCE()
    const newState = generateState()

    setResponseType('code')
    setFormClientId(clientId ?? '')
    setRedirectUri(getCallbackUrl())
    setScope(supportedScopes?.join(' ') ?? 'openid')
    setState(newState)
    setCodeChallenge(pkce.code_challenge)
    setCodeChallengeMethod(pkce.code_challenge_method)
    setCodeVerifier(pkce.code_verifier)
    setIsGenerating(false)
  }, [clientId, supportedScopes])

  // Generate default values when form is first shown
  useEffect(() => {
    if ((isPending || isError) && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true
      // Schedule async to avoid setState in effect body
      void (async () => {
        const pkce = await generatePKCE()
        const newState = generateState()
        setResponseType('code')
        setFormClientId(clientId ?? '')
        setRedirectUri(getCallbackUrl())
        setScope(supportedScopes?.join(' ') ?? 'openid')
        setState(newState)
        setCodeChallenge(pkce.code_challenge)
        setCodeChallengeMethod(pkce.code_challenge_method)
        setCodeVerifier(pkce.code_verifier)
        setIsGenerating(false)
      })()
    }
  }, [isPending, isError, clientId, supportedScopes])

  const handleEdit = async () => {
    // When editing, regenerate PKCE and state
    setIsGenerating(true)
    await generateDefaults()
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    await generateDefaults()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      onReset()
    }
    onAuthorize({
      responseType,
      clientId: formClientId,
      redirectUri,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
      codeVerifier,
    })
    setIsEditing(false)
  }

  const showForm = isPending || isError || isEditing

  return (
    <StepBase
      step={step}
      index={index}
      title="Authorization"
      onFork={onFork}
      onReset={isComplete && !isEditing ? handleEdit : undefined}
    >
      {isComplete && !isEditing ? (
        <div className="metadata-grid">
          {step.responseType && (
            <div className="metadata-item">
              <label>Response Type</label>
              <div className="step-value">{step.responseType}</div>
            </div>
          )}
          {step.clientId && (
            <div className="metadata-item">
              <label>Client ID</label>
              <div className="step-value">{step.clientId}</div>
            </div>
          )}
          {step.redirectUri && (
            <div className="metadata-item">
              <label>Redirect URI</label>
              <div className="step-value">{step.redirectUri}</div>
            </div>
          )}
          {step.scope && (
            <div className="metadata-item">
              <label>Scope</label>
              <div className="step-value">{step.scope}</div>
            </div>
          )}
          {step.state && (
            <div className="metadata-item">
              <label>State</label>
              <div className="step-value">{step.state}</div>
            </div>
          )}
          {step.codeChallenge && (
            <div className="metadata-item">
              <label>Code Challenge</label>
              <div className="step-value">{step.codeChallenge}</div>
            </div>
          )}
          {step.codeChallengeMethod && (
            <div className="metadata-item">
              <label>Code Challenge Method</label>
              <div className="step-value">{step.codeChallengeMethod}</div>
            </div>
          )}
          {step.authorizationUrl && (
            <div className="metadata-item">
              <label>Authorization URL</label>
              <div className="step-value" style={{ wordBreak: 'break-all' }}>
                {step.authorizationUrl}
              </div>
            </div>
          )}
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="step-form">
          <div className="form-row">
            <label htmlFor="response-type">Response Type</label>
            <input
              id="response-type"
              type="text"
              className="input-with-spacer"
              value={responseType}
              onChange={(e) => setResponseType(e.target.value)}
              placeholder="code"
            />
          </div>

          <div className="form-row">
            <label htmlFor="client-id">Client ID</label>
            <input
              id="client-id"
              type="text"
              className="input-with-spacer"
              value={formClientId}
              onChange={(e) => setFormClientId(e.target.value)}
              placeholder="your-client-id"
            />
          </div>

          <div className="form-row">
            <label htmlFor="redirect-uri">Redirect URI</label>
            <input
              id="redirect-uri"
              type="text"
              className="input-with-spacer"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="https://example.com/callback"
            />
          </div>

          <div className="form-row">
            <label htmlFor="scope">Scope</label>
            <input
              id="scope"
              type="text"
              className="input-with-spacer"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="openid profile email"
            />
          </div>
          {supportedScopes && supportedScopes.length > 0 && (
            <div className="form-row">
              <label>Supported</label>
              <div className="scope-hints input-with-spacer">
                {supportedScopes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="scope-hint"
                    onClick={() => setScope((prev) => (prev ? `${prev} ${s}` : s))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <label htmlFor="state">State</label>
            <input
              id="state"
              type="text"
              className="input-with-spacer"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="random-state"
            />
          </div>

          <div className="form-row">
            <label htmlFor="code-challenge">Code Challenge</label>
            <input
              id="code-challenge"
              type="text"
              className="input-with-spacer"
              value={codeChallenge}
              onChange={(e) => setCodeChallenge(e.target.value)}
              placeholder="PKCE code challenge"
            />
          </div>

          <div className="form-row">
            <label htmlFor="code-challenge-method">Challenge Method</label>
            <select
              id="code-challenge-method"
              className="input-with-spacer"
              value={codeChallengeMethod}
              onChange={(e) => setCodeChallengeMethod(e.target.value)}
            >
              <option value="S256">S256</option>
              <option value="plain">plain</option>
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="code-verifier">Code Verifier</label>
            <input
              id="code-verifier"
              type="text"
              className="input-with-spacer"
              value={codeVerifier}
              onChange={(e) => setCodeVerifier(e.target.value)}
              placeholder="PKCE code verifier"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isGenerating}>
              Authorize
            </button>
            <button type="button" className="secondary" onClick={handleRegenerate}>
              Regenerate
            </button>
            {isEditing && (
              <button type="button" className="secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="step-loading">Redirecting to authorization server...</div>
      )}
    </StepBase>
  )
}
