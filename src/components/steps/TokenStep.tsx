import type { TokenStep as TokenStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface TokenStepProps {
  step: TokenStepType
  index: number
  onFork: () => void
  onExchange: () => void
}

export function TokenStep({ step, index, onFork, onExchange }: TokenStepProps) {
  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'

  return (
    <StepBase step={step} index={index} title="Token Exchange" onFork={onFork}>
      {isComplete && step.tokens ? (
        <div className="step-result">
          <div className="metadata-grid">
            <div className="metadata-item">
              <label>Access Token</label>
              <div className="step-value mono truncate">{step.tokens.access_token}</div>
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
                <div className="step-value mono truncate">{step.tokens.refresh_token}</div>
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
                <div className="step-value mono truncate">{step.tokens.id_token}</div>
              </div>
            )}
          </div>
        </div>
      ) : isPending ? (
        <div className="step-form">
          <p className="step-description">
            Exchange the authorization code for tokens using the token endpoint.
          </p>
          <button onClick={onExchange}>Exchange Code for Tokens</button>
        </div>
      ) : (
        <div className="step-loading">Exchanging code for tokens...</div>
      )}
    </StepBase>
  )
}
