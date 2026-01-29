import type { RevokeStep as RevokeStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface RevokeStepProps {
  step: RevokeStepType
  index: number
  onFork: () => void
  onRevoke: () => void
  hasRevocationEndpoint: boolean
}

export function RevokeStep({
  step,
  index,
  onFork,
  onRevoke,
  hasRevocationEndpoint,
}: RevokeStepProps) {
  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'

  return (
    <StepBase step={step} index={index} title="Token Revocation" onFork={onFork}>
      {isComplete ? (
        <div className="step-result">
          <div className="metadata-item">
            <label>Status</label>
            <div className="step-value success">Token revoked successfully</div>
          </div>
        </div>
      ) : isPending ? (
        <div className="step-form">
          <p className="step-description">Revoke the access token or refresh token.</p>
          {!hasRevocationEndpoint ? (
            <p className="step-warning">Revocation endpoint not available.</p>
          ) : (
            <button onClick={onRevoke} className="danger">
              Revoke Token
            </button>
          )}
        </div>
      ) : (
        <div className="step-loading">Revoking token...</div>
      )}
    </StepBase>
  )
}
