import { useState } from 'react'
import type {
  RegistrationStep as RegistrationStepType,
  ClientCredentials,
  RegistrationRequest,
} from '../../types'
import { getDefaultRegistrationRequest } from '../../services/oauth'
import { StepBase } from './StepBase'
import './StepForms.css'

interface RegistrationStepProps {
  step: RegistrationStepType
  index: number
  onFork: () => void
  onRegister: (request: RegistrationRequest) => void
  onManualCredentials: (credentials: ClientCredentials) => void
  onReset: () => void
  hasRegistrationEndpoint: boolean
}

// Array field component with + / - buttons
function ArrayField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const handleAdd = (afterIndex: number) => {
    const newValues = [...values]
    newValues.splice(afterIndex + 1, 0, '')
    onChange(newValues)
  }

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, value: string) => {
    const newValues = [...values]
    newValues[index] = value
    onChange(newValues)
  }

  return (
    <div className="array-field">
      {values.map((value, index) => (
        <div key={index} className="form-row array-row">
          {index === 0 ? <label>{label}</label> : <label />}
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="array-btn add"
            onClick={() => handleAdd(index)}
            title="Add item"
          >
            +
          </button>
          <button
            type="button"
            className="array-btn remove"
            onClick={() => handleRemove(index)}
            title="Remove item"
            disabled={values.length <= 1}
          >
            -
          </button>
        </div>
      ))}
    </div>
  )
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

  // Manual credentials state
  const [clientId, setClientId] = useState(step.credentials?.client_id ?? '')
  const [clientSecret, setClientSecret] = useState('')

  // Dynamic registration state
  const defaultRequest = getDefaultRegistrationRequest()
  const [regRequest, setRegRequest] = useState<RegistrationRequest>(defaultRequest)

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  const handleEdit = () => {
    setMode(step.mode)
    setClientId(step.credentials?.client_id ?? '')
    setClientSecret('')
    setRegRequest(getDefaultRegistrationRequest())
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (clientId.trim()) {
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

  const handleDynamicRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      onReset()
    }
    onRegister(regRequest)
    setIsEditing(false)
  }

  const updateRegRequest = (updates: Partial<RegistrationRequest>) => {
    setRegRequest((prev) => ({ ...prev, ...updates }))
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
              <div className="step-value">********</div>
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
            <form onSubmit={handleDynamicRegister} className="registration-form">
              <ArrayField
                label="Redirect URIs"
                values={regRequest.redirect_uris}
                onChange={(values) => updateRegRequest({ redirect_uris: values })}
                placeholder="https://example.com/callback"
              />

              <div className="form-row">
                <label htmlFor="client-name">Client Name</label>
                <input
                  id="client-name"
                  type="text"
                  value={regRequest.client_name ?? ''}
                  onChange={(e) => updateRegRequest({ client_name: e.target.value })}
                  placeholder="My OAuth Client"
                />
                <div className="input-spacer" />
              </div>

              <div className="form-row">
                <label htmlFor="token-auth-method">Token Auth Method</label>
                <select
                  id="token-auth-method"
                  value={regRequest.token_endpoint_auth_method ?? ''}
                  onChange={(e) => updateRegRequest({ token_endpoint_auth_method: e.target.value })}
                >
                  <option value="client_secret_basic">client_secret_basic</option>
                  <option value="client_secret_post">client_secret_post</option>
                  <option value="none">none (public client)</option>
                </select>
                <div className="input-spacer" />
              </div>

              <ArrayField
                label="Grant Types"
                values={regRequest.grant_types ?? []}
                onChange={(values) => updateRegRequest({ grant_types: values })}
                placeholder="authorization_code"
              />

              <ArrayField
                label="Response Types"
                values={regRequest.response_types ?? []}
                onChange={(values) => updateRegRequest({ response_types: values })}
                placeholder="code"
              />

              <div className="form-row">
                <label htmlFor="scope">Scope</label>
                <input
                  id="scope"
                  type="text"
                  value={regRequest.scope ?? ''}
                  onChange={(e) => updateRegRequest({ scope: e.target.value })}
                  placeholder="openid profile email"
                />
                <div className="input-spacer" />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={!regRequest.redirect_uris.some((uri) => uri.trim())}
                >
                  Register Client
                </button>
                {isEditing && (
                  <button type="button" className="secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
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
