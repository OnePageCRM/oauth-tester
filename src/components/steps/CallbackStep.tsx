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

  return (
    <StepBase step={step} index={index} title="Callback" onFork={onFork}>
      {isComplete && step.code ? (
        <div className="step-result">
          <div className="metadata-item">
            <label>Authorization Code</label>
            <div className="step-value mono truncate">{step.code}</div>
          </div>
        </div>
      ) : isError ? (
        <div className="step-result">
          <div className="metadata-grid">
            <div className="metadata-item">
              <label>Error</label>
              <div className="step-value error">{step.error}</div>
            </div>
            {step.errorDescription && (
              <div className="metadata-item">
                <label>Error Description</label>
                <div className="step-value">{step.errorDescription}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="step-loading">Waiting for authorization callback...</div>
      )}
    </StepBase>
  )
}
