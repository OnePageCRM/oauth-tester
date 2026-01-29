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
  const isPending = step.status === 'pending'

  return (
    <StepBase step={step} index={index} title="Callback" onFork={onFork}>
      {isComplete && step.code ? (
        <div className="metadata-grid">
          <div className="metadata-item">
            <label>Authorization Code</label>
            <div className="step-value">{step.code}</div>
          </div>
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
