import type { RefreshStep as RefreshStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface RefreshStepProps {
  step: RefreshStepType
  index: number
  onFork: () => void
  onRefresh: () => void
  onReset: () => void
  hasRefreshToken: boolean
}

export function RefreshStep({
  step,
  index,
  onFork,
  onRefresh,
  onReset,
  hasRefreshToken,
}: RefreshStepProps) {
  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  return (
    <StepBase
      step={step}
      index={index}
      title="Token Refresh"
      onFork={onFork}
      onReset={isComplete || isError ? onReset : undefined}
    >
      {isComplete && step.tokens ? (
        <div className="step-result">
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
        </div>
      ) : isPending || isError ? (
        <div className="step-form">
          <p className="step-description">Use the refresh token to obtain new access tokens.</p>
          <div className="form-actions" style={{ marginLeft: 0 }}>
            {!hasRefreshToken ? (
              <p className="step-warning">No refresh token available.</p>
            ) : (
              <button onClick={onRefresh}>Refresh Tokens</button>
            )}
          </div>
        </div>
      ) : (
        <div className="step-loading">Refreshing tokens...</div>
      )}
    </StepBase>
  )
}
