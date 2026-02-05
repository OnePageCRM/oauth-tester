import type { CallbackStep as CallbackStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface CallbackStepProps {
  step: CallbackStepType
  index: number
  onFork: () => void
}

export function CallbackStep({ step, index, onFork }: CallbackStepProps) {
  const isComplete = step.status === 'complete'
  const isError = step.status === 'error'
  const isPending = step.status === 'pending'
  const showDetails = isComplete || isError

  return (
    <StepBase
      step={step}
      index={index}
      title="Callback"
      onFork={onFork}
      errorDetails={step.errorDescription}
    >
      {showDetails ? (
        <div className="metadata-grid">
          {/* Success: show authorization code */}
          {step.code && (
            <div className="metadata-item">
              <label>Authorization Code</label>
              <div className="step-value">{step.code}</div>
            </div>
          )}

          {/* State parameter */}
          {step.state && (
            <div className="metadata-item">
              <label>State</label>
              <div className="step-value">{step.state}</div>
            </div>
          )}

          {/* Issuer (RFC 9207) */}
          {step.iss && (
            <div className="metadata-item">
              <label>Issuer (iss)</label>
              <div className="step-value">{step.iss}</div>
            </div>
          )}

          {/* Error code */}
          {step.error && (
            <div className="metadata-item">
              <label>Error</label>
              <div className="step-value">{step.error}</div>
            </div>
          )}

          {/* Error description */}
          {step.errorDescription && (
            <div className="metadata-item">
              <label>Error Description</label>
              <div className="step-value">{step.errorDescription}</div>
            </div>
          )}

          {/* Unrecognized/extra parameters */}
          {step.extraParams && Object.keys(step.extraParams).length > 0 && (
            <>
              {Object.entries(step.extraParams).map(([key, value]) => (
                <div key={key} className="metadata-item extra-param">
                  <label>{key}</label>
                  <div className="step-value">{value}</div>
                </div>
              ))}
            </>
          )}

          {/* Callback URL */}
          {step.callbackUrl && (
            <div className="metadata-item">
              <label>Callback URL</label>
              <div className="step-value" style={{ wordBreak: 'break-all' }}>
                {step.callbackUrl}
              </div>
            </div>
          )}
        </div>
      ) : isPending ? (
        <div className="step-form">
          <p className="step-description">
            Waiting for authorization callback. Complete the login on the authorization server.
          </p>
        </div>
      ) : (
        <div className="step-loading">Processing callback...</div>
      )}
    </StepBase>
  )
}
