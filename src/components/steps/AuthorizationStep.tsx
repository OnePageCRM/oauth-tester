import { useState } from 'react'
import type { AuthorizationStep as AuthorizationStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface AuthorizationStepProps {
  step: AuthorizationStepType
  index: number
  onFork: () => void
  onAuthorize: (scope: string) => void
  supportedScopes?: string[]
}

export function AuthorizationStep({
  step,
  index,
  onFork,
  onAuthorize,
  supportedScopes,
}: AuthorizationStepProps) {
  const [scope, setScope] = useState(step.scope ?? supportedScopes?.join(' ') ?? 'openid')

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAuthorize(scope)
  }

  return (
    <StepBase step={step} index={index} title="Authorization" onFork={onFork}>
      {isComplete ? (
        <div className="step-result">
          <div className="metadata-grid">
            {step.scope && (
              <div className="metadata-item">
                <label>Scope</label>
                <div className="step-value">{step.scope}</div>
              </div>
            )}
            {step.state && (
              <div className="metadata-item">
                <label>State</label>
                <div className="step-value mono">{step.state}</div>
              </div>
            )}
            {step.pkce && (
              <>
                <div className="metadata-item">
                  <label>PKCE Method</label>
                  <div className="step-value">{step.pkce.code_challenge_method}</div>
                </div>
                <div className="metadata-item">
                  <label>Code Challenge</label>
                  <div className="step-value mono truncate">{step.pkce.code_challenge}</div>
                </div>
              </>
            )}
          </div>
          {step.authorizationUrl && (
            <div className="metadata-item" style={{ marginTop: '12px' }}>
              <label>Authorization URL</label>
              <div className="step-value mono small truncate">{step.authorizationUrl}</div>
            </div>
          )}
        </div>
      ) : isPending ? (
        <form onSubmit={handleSubmit} className="step-form">
          <p className="step-description">
            Configure and initiate the authorization request. PKCE will be generated automatically.
          </p>
          <label htmlFor="scope">Scope</label>
          <input
            id="scope"
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="openid profile email"
          />
          {supportedScopes && supportedScopes.length > 0 && (
            <div className="scope-hints">
              Supported:{' '}
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
          )}
          <button type="submit">Authorize</button>
        </form>
      ) : (
        <div className="step-loading">Redirecting to authorization server...</div>
      )}
    </StepBase>
  )
}
