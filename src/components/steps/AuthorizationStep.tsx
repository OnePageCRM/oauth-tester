import { useState } from 'react'
import type { AuthorizationStep as AuthorizationStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface AuthorizationStepProps {
  step: AuthorizationStepType
  index: number
  onFork: () => void
  onAuthorize: (scope: string) => void
  onReset: () => void
  supportedScopes?: string[]
}

export function AuthorizationStep({
  step,
  index,
  onFork,
  onAuthorize,
  onReset,
  supportedScopes,
}: AuthorizationStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [scope, setScope] = useState(step.scope ?? supportedScopes?.join(' ') ?? 'openid')

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  const handleEdit = () => {
    setScope(step.scope ?? supportedScopes?.join(' ') ?? 'openid')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      onReset()
    }
    onAuthorize(scope)
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
          {step.pkce && (
            <>
              <div className="metadata-item">
                <label>PKCE Method</label>
                <div className="step-value">{step.pkce.code_challenge_method}</div>
              </div>
              <div className="metadata-item">
                <label>Code Challenge</label>
                <div className="step-value">{step.pkce.code_challenge}</div>
              </div>
            </>
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
            <label htmlFor="scope">Scope</label>
            <input
              id="scope"
              type="text"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="openid profile email"
            />
            <div className="input-spacer" />
          </div>
          {supportedScopes && supportedScopes.length > 0 && (
            <div className="form-row">
              <label>Supported</label>
              <div className="scope-hints">
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
              <div className="input-spacer" />
            </div>
          )}
          <div className="form-actions">
            <button type="submit">Authorize</button>
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
