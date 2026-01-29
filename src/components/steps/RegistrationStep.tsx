import { useState } from 'react'
import type { RegistrationStep as RegistrationStepType, ClientCredentials } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface RegistrationStepProps {
  step: RegistrationStepType
  index: number
  onFork: () => void
  onRegister: () => void
  onManualCredentials: (credentials: ClientCredentials) => void
  hasRegistrationEndpoint: boolean
}

export function RegistrationStep({
  step,
  index,
  onFork,
  onRegister,
  onManualCredentials,
  hasRegistrationEndpoint,
}: RegistrationStepProps) {
  const [mode, setMode] = useState<'dynamic' | 'manual'>(
    hasRegistrationEndpoint ? 'dynamic' : 'manual'
  )
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (clientId.trim()) {
      onManualCredentials({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim() || undefined,
      })
    }
  }

  return (
    <StepBase step={step} index={index} title="Registration" onFork={onFork}>
      {isComplete && step.credentials ? (
        <div className="step-result">
          <div className="metadata-grid">
            <div className="metadata-item">
              <label>Client ID</label>
              <div className="step-value mono">{step.credentials.client_id}</div>
            </div>
            {step.credentials.client_secret && (
              <div className="metadata-item">
                <label>Client Secret</label>
                <div className="step-value mono">••••••••</div>
              </div>
            )}
            <div className="metadata-item">
              <label>Registration Mode</label>
              <div className="step-value">{step.mode === 'dynamic' ? 'Dynamic' : 'Manual'}</div>
            </div>
          </div>
        </div>
      ) : isPending ? (
        <div className="step-form">
          {hasRegistrationEndpoint && (
            <div className="mode-toggle">
              <button
                type="button"
                className={mode === 'dynamic' ? 'active' : ''}
                onClick={() => setMode('dynamic')}
              >
                Dynamic Registration
              </button>
              <button
                type="button"
                className={mode === 'manual' ? 'active' : ''}
                onClick={() => setMode('manual')}
              >
                Manual Input
              </button>
            </div>
          )}

          {mode === 'dynamic' ? (
            <>
              <p className="step-description">
                Register a new client dynamically with the authorization server.
              </p>
              <button onClick={onRegister}>Register Client</button>
            </>
          ) : (
            <form onSubmit={handleManualSubmit}>
              <p className="step-description">Enter existing client credentials.</p>
              <label htmlFor="client-id">Client ID</label>
              <input
                id="client-id"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="your-client-id"
              />
              <label htmlFor="client-secret">Client Secret (optional)</label>
              <input
                id="client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="your-client-secret"
              />
              <button type="submit" disabled={!clientId.trim()}>
                Save Credentials
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="step-loading">Registering client...</div>
      )}
    </StepBase>
  )
}
