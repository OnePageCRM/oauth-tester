import type { RefreshStep as RefreshStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface RefreshStepProps {
  step: RefreshStepType
  index: number
  onFork: () => void
  onRefresh: () => void
  hasRefreshToken: boolean
}

export function RefreshStep({ step, index, onFork, onRefresh, hasRefreshToken }: RefreshStepProps) {
  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'

  return (
    <StepBase step={step} index={index} title="Token Refresh" onFork={onFork}>
      {isComplete && step.tokens ? (
        <div className="step-result">
          <div className="metadata-grid">
            <div className="metadata-item">
              <label>New Access Token</label>
              <div className="step-value mono truncate">{step.tokens.access_token}</div>
            </div>
            {step.tokens.expires_in && (
              <div className="metadata-item">
                <label>Expires In</label>
                <div className="step-value">{step.tokens.expires_in} seconds</div>
              </div>
            )}
            {step.tokens.refresh_token && (
              <div className="metadata-item">
                <label>New Refresh Token</label>
                <div className="step-value mono truncate">{step.tokens.refresh_token}</div>
              </div>
            )}
          </div>
        </div>
      ) : isPending ? (
        <div className="step-form">
          <p className="step-description">Use the refresh token to obtain new access tokens.</p>
          {!hasRefreshToken ? (
            <p className="step-warning">No refresh token available.</p>
          ) : (
            <button onClick={onRefresh}>Refresh Tokens</button>
          )}
        </div>
      ) : (
        <div className="step-loading">Refreshing tokens...</div>
      )}
    </StepBase>
  )
}
