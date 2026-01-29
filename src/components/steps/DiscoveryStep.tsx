import type { DiscoveryStep as DiscoveryStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface DiscoveryStepProps {
  step: DiscoveryStepType
  index: number
  onFork: () => void
  onDiscover: () => void
}

export function DiscoveryStep({ step, index, onFork, onDiscover }: DiscoveryStepProps) {
  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'

  return (
    <StepBase step={step} index={index} title="Discovery" onFork={onFork}>
      {isComplete && step.metadata ? (
        <div className="metadata-grid">
          <MetadataItem label="Issuer" value={step.metadata.issuer} />
          <MetadataItem label="Authorization" value={step.metadata.authorization_endpoint} />
          <MetadataItem label="Token" value={step.metadata.token_endpoint} />
          {step.metadata.registration_endpoint && (
            <MetadataItem label="Registration" value={step.metadata.registration_endpoint} />
          )}
          {step.metadata.introspection_endpoint && (
            <MetadataItem label="Introspection" value={step.metadata.introspection_endpoint} />
          )}
          {step.metadata.revocation_endpoint && (
            <MetadataItem label="Revocation" value={step.metadata.revocation_endpoint} />
          )}
          {step.metadata.scopes_supported && (
            <MetadataItem label="Scopes" value={step.metadata.scopes_supported.join(', ')} />
          )}
          {step.metadata.code_challenge_methods_supported && (
            <MetadataItem
              label="PKCE Methods"
              value={step.metadata.code_challenge_methods_supported.join(', ')}
            />
          )}
        </div>
      ) : isPending ? (
        <div className="step-form">
          <div className="form-actions" style={{ marginLeft: 0 }}>
            <button onClick={onDiscover}>Fetch Metadata</button>
          </div>
        </div>
      ) : (
        <div className="step-loading">Fetching metadata...</div>
      )}
    </StepBase>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-item">
      <label>{label}</label>
      <div className="step-value">{value}</div>
    </div>
  )
}
