import { useState } from 'react'
import type { TokenStep as TokenStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface TokenStepProps {
  step: TokenStepType
  index: number
  onFork: () => void
  onExchange: () => void
  onReset: () => void
}

export function TokenStep({ step, index, onFork, onExchange, onReset }: TokenStepProps) {
  const [isEditing, setIsEditing] = useState(false)

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleExchange = () => {
    if (isEditing) {
      onReset()
    }
    onExchange()
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
          {step.tokens.expires_in && (
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
        <div className="step-form">
          <p className="step-description">
            Exchange the authorization code for tokens using the token endpoint.
          </p>
          <div className="form-actions" style={{ marginLeft: 0 }}>
            <button onClick={handleExchange}>Exchange Code for Tokens</button>
            {isEditing && (
              <button type="button" className="secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="step-loading">Exchanging code for tokens...</div>
      )}
    </StepBase>
  )
}
