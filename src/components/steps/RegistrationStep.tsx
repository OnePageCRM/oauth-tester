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
  onReset: () => void
  hasRegistrationEndpoint: boolean
}

export function RegistrationStep({
  step,
  index,
  onFork,
  onRegister,
  onManualCredentials,
  onReset,
  hasRegistrationEndpoint,
}: RegistrationStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [mode, setMode] = useState<'dynamic' | 'manual'>(step.mode)
  const [clientId, setClientId] = useState(step.credentials?.client_id ?? '')
  const [clientSecret, setClientSecret] = useState('')

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  const handleEdit = () => {
    setMode(step.mode)
    setClientId(step.credentials?.client_id ?? '')
    setClientSecret('')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (clientId.trim()) {
      // Only reset if credentials changed
      const credentialsChanged =
        clientId.trim() !== step.credentials?.client_id ||
        (clientSecret.trim() && clientSecret.trim() !== step.credentials?.client_secret)

      if (credentialsChanged && isEditing) {
        onReset()
      }
      onManualCredentials({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim() || undefined,
      })
      setIsEditing(false)
    }
  }

  const handleDynamicRegister = () => {
    if (isEditing) {
      onReset()
    }
    onRegister()
    setIsEditing(false)
  }

  const showForm = isPending || isError || isEditing

  return (
    <StepBase
      step={step}
      index={index}
      title="Registration"
      onFork={onFork}
      onReset={isComplete && !isEditing ? handleEdit : undefined}
    >
      {isComplete && step.credentials && !isEditing ? (
        <div className="metadata-grid">
          <div className="metadata-item">
            <label>Client ID</label>
            <div className="step-value">{step.credentials.client_id}</div>
          </div>
          {step.credentials.client_secret && (
            <div className="metadata-item">
              <label>Client Secret</label>
              <div className="step-value">••••••••</div>
            </div>
          )}
          <div className="metadata-item">
            <label>Mode</label>
            <div className="step-value">{step.mode === 'dynamic' ? 'Dynamic' : 'Manual'}</div>
          </div>
        </div>
      ) : showForm ? (
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
            <div className="form-actions" style={{ marginLeft: 0 }}>
              <button onClick={handleDynamicRegister}>Register Client</button>
              {isEditing && (
                <button type="button" className="secondary" onClick={handleCancel}>
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit}>
              <div className="form-row">
                <label htmlFor="client-id">Client ID</label>
                <input
                  id="client-id"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="your-client-id"
                />
              </div>
              <div className="form-row">
                <label htmlFor="client-secret">Client Secret</label>
                <input
                  id="client-secret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={!clientId.trim()}>
                  Save Credentials
                </button>
                {isEditing && (
                  <button type="button" className="secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="step-loading">Registering client...</div>
      )}
    </StepBase>
  )
}
