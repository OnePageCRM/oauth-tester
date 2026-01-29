import type { IntrospectStep as IntrospectStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface IntrospectStepProps {
  step: IntrospectStepType
  index: number
  onFork: () => void
  onIntrospect: () => void
  hasIntrospectionEndpoint: boolean
}

export function IntrospectStep({
  step,
  index,
  onFork,
  onIntrospect,
  hasIntrospectionEndpoint,
}: IntrospectStepProps) {
  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'

  return (
    <StepBase step={step} index={index} title="Token Introspection" onFork={onFork}>
      {isComplete && step.tokenInfo ? (
        <div className="step-result">
          <div className="metadata-grid">
            {Object.entries(step.tokenInfo).map(([key, value]) => (
              <div key={key} className="metadata-item">
                <label>{key}</label>
                <div className="step-value mono">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : isPending ? (
        <div className="step-form">
          <p className="step-description">Introspect the access token to get its metadata.</p>
          {!hasIntrospectionEndpoint ? (
            <p className="step-warning">Introspection endpoint not available.</p>
          ) : (
            <button onClick={onIntrospect}>Introspect Token</button>
          )}
        </div>
      ) : (
        <div className="step-loading">Introspecting token...</div>
      )}
    </StepBase>
  )
}
