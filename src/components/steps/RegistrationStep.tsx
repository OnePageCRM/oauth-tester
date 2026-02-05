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
// States:
// - values = undefined → no input, field not sent
// - values = [''] → one empty input, sends []
// - values = [' '] → one input with space, sends ['']
// - values = ['value'] → sends ['value']
function ArrayField({
  label,
  required,
  values,
  onChange,
  placeholder,
}: {
  label: string
  required?: boolean
  values: string[] | undefined
  onChange: (values: string[] | undefined) => void
  placeholder?: string
}) {
  const handleAdd = (afterIndex?: number) => {
    if (values === undefined) {
      onChange([''])
    } else {
      const newValues = [...values]
      newValues.splice((afterIndex ?? -1) + 1, 0, '')
      onChange(newValues)
    }
  }

  const handleRemove = (index: number) => {
    if (!values) return
    if (values.length <= 1) {
      // Removing last item - set to undefined (don't send field)
      onChange(undefined)
    } else {
      onChange(values.filter((_, i) => i !== index))
    }
  }

  const handleChange = (index: number, value: string) => {
    if (!values) return
    const newValues = [...values]
    newValues[index] = value
    onChange(newValues)
  }

  // No inputs - show label and + button with spacers to keep alignment
  if (values === undefined) {
    return (
      <div className="array-field">
        <div className="form-row array-row">
          <label>
            {label}
            {required && <span className="required">*</span>}
          </label>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="array-btn add"
            onClick={() => handleAdd()}
            title="Add item"
          >
            +
          </button>
          <div style={{ width: 28, flexShrink: 0 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="array-field">
      {values.map((value, index) => (
        <div key={index} className="form-row array-row">
          {index === 0 ? (
            <label>
              {label}
              {required && <span className="required">*</span>}
            </label>
          ) : (
            <label />
          )}
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
  const [customAuthMethod, setCustomAuthMethod] = useState(false)

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  const handleEdit = () => {
    setMode(step.mode)
    setClientId(step.credentials?.client_id ?? '')
    setClientSecret('')
    setRegRequest(getDefaultRegistrationRequest())
    setCustomAuthMethod(false)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const credentialsChanged =
      clientId !== step.credentials?.client_id ||
      (clientSecret && clientSecret !== step.credentials?.client_secret)

    if (credentialsChanged && isEditing) {
      onReset()
    }
    onManualCredentials({
      client_id: clientId,
      client_secret: clientSecret || undefined,
    })
    setIsEditing(false)
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
            <label>Mode</label>
            <div className="step-value">{step.mode === 'dynamic' ? 'Dynamic' : 'Manual'}</div>
          </div>
          {Object.entries(step.credentials).map(([key, value]) => {
            if (value === undefined || value === null) return null
            // Format the display value
            let displayValue: string
            if (key === 'client_secret') {
              displayValue = '********'
            } else if (Array.isArray(value)) {
              displayValue = value.join(', ')
            } else if (typeof value === 'object') {
              displayValue = JSON.stringify(value)
            } else if (key === 'client_id_issued_at') {
              displayValue = new Date(Number(value) * 1000).toLocaleString()
            } else if (key === 'client_secret_expires_at') {
              displayValue = Number(value) === 0 ? 'Never' : new Date(Number(value) * 1000).toLocaleString()
            } else {
              displayValue = String(value)
            }
            // Format the label (snake_case to Title Case)
            const label = key
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
            return (
              <div key={key} className="metadata-item">
                <label>{label}</label>
                <div className="step-value">{displayValue}</div>
              </div>
            )
          })}
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
              {/* client_name */}
              <div className="form-row">
                <label htmlFor="client-name">Client Name</label>
                <input
                  id="client-name"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.client_name ?? ''}
                  onChange={(e) => updateRegRequest({ client_name: e.target.value })}
                  placeholder="My OAuth Client"
                />
              </div>

              {/* client_uri */}
              <div className="form-row">
                <label htmlFor="client-uri">Client URI</label>
                <input
                  id="client-uri"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.client_uri ?? ''}
                  onChange={(e) => updateRegRequest({ client_uri: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              {/* contacts */}
              <ArrayField
                label="Contacts"
                values={regRequest.contacts}
                onChange={(values) => updateRegRequest({ contacts: values })}
                placeholder="admin@example.com"
              />

              {/* redirect_uris - Required */}
              <ArrayField
                label="Redirect URIs"
                required
                values={regRequest.redirect_uris}
                onChange={(values) => updateRegRequest({ redirect_uris: values })}
                placeholder="https://example.com/callback"
              />

              {/* grant_types */}
              <ArrayField
                label="Grant Types"
                values={regRequest.grant_types}
                onChange={(values) => updateRegRequest({ grant_types: values })}
                placeholder="authorization_code"
              />

              {/* response_types */}
              <ArrayField
                label="Response Types"
                values={regRequest.response_types}
                onChange={(values) => updateRegRequest({ response_types: values })}
                placeholder="code"
              />

              {/* token_endpoint_auth_method */}
              <div className="form-row">
                <label htmlFor="token-auth-method">Token Endpoint Auth Method</label>
                <select
                  id="token-auth-method"
                  className={!customAuthMethod ? 'input-with-spacer' : undefined}
                  value={
                    customAuthMethod ? '__custom__' : (regRequest.token_endpoint_auth_method ?? '')
                  }
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCustomAuthMethod(true)
                      updateRegRequest({ token_endpoint_auth_method: '' })
                    } else {
                      setCustomAuthMethod(false)
                      updateRegRequest({ token_endpoint_auth_method: e.target.value })
                    }
                  }}
                >
                  <option value="">-- not set --</option>
                  <option value="client_secret_basic">client_secret_basic</option>
                  <option value="client_secret_post">client_secret_post</option>
                  <option value="client_secret_jwt">client_secret_jwt</option>
                  <option value="private_key_jwt">private_key_jwt</option>
                  <option value="none">none</option>
                  <option value="__custom__">Customize...</option>
                </select>
                {customAuthMethod && (
                  <input
                    type="text"
                    className="input-with-spacer"
                    value={regRequest.token_endpoint_auth_method ?? ''}
                    onChange={(e) =>
                      updateRegRequest({ token_endpoint_auth_method: e.target.value })
                    }
                    placeholder="custom_auth_method"
                  />
                )}
              </div>

              {/* scope */}
              <div className="form-row">
                <label htmlFor="scope">Scope</label>
                <input
                  id="scope"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.scope ?? ''}
                  onChange={(e) => updateRegRequest({ scope: e.target.value })}
                  placeholder="openid profile email"
                />
              </div>

              {/* logo_uri */}
              <div className="form-row">
                <label htmlFor="logo-uri">Logo URI</label>
                <input
                  id="logo-uri"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.logo_uri ?? ''}
                  onChange={(e) => updateRegRequest({ logo_uri: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              {/* tos_uri */}
              <div className="form-row">
                <label htmlFor="tos-uri">TOS URI</label>
                <input
                  id="tos-uri"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.tos_uri ?? ''}
                  onChange={(e) => updateRegRequest({ tos_uri: e.target.value })}
                  placeholder="https://example.com/tos"
                />
              </div>

              {/* policy_uri */}
              <div className="form-row">
                <label htmlFor="policy-uri">Policy URI</label>
                <input
                  id="policy-uri"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.policy_uri ?? ''}
                  onChange={(e) => updateRegRequest({ policy_uri: e.target.value })}
                  placeholder="https://example.com/privacy"
                />
              </div>

              {/* jwks_uri */}
              <div className="form-row">
                <label htmlFor="jwks-uri">JWKS URI</label>
                <input
                  id="jwks-uri"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.jwks_uri ?? ''}
                  onChange={(e) => updateRegRequest({ jwks_uri: e.target.value })}
                  placeholder="https://example.com/.well-known/jwks.json"
                />
              </div>

              {/* jwks */}
              <div className="form-row">
                <label htmlFor="jwks">JWKS</label>
                <input
                  id="jwks"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.jwks ?? ''}
                  onChange={(e) => updateRegRequest({ jwks: e.target.value })}
                  placeholder='{"keys": [...]}'
                />
              </div>

              {/* software_id */}
              <div className="form-row">
                <label htmlFor="software-id">Software ID</label>
                <input
                  id="software-id"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.software_id ?? ''}
                  onChange={(e) => updateRegRequest({ software_id: e.target.value })}
                  placeholder="UUID"
                />
              </div>

              {/* software_version */}
              <div className="form-row">
                <label htmlFor="software-version">Software Version</label>
                <input
                  id="software-version"
                  type="text"
                  className="input-with-spacer"
                  value={regRequest.software_version ?? ''}
                  onChange={(e) => updateRegRequest({ software_version: e.target.value })}
                  placeholder="1.0.0"
                />
              </div>

              <div className="form-actions">
                <button type="submit">Register Client</button>
                {isEditing && (
                  <button type="button" className="secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} className="step-form">
              <div className="form-row">
                <label htmlFor="client-id">
                  Client ID<span className="required">*</span>
                </label>
                <input
                  id="client-id"
                  type="text"
                  className="input-with-spacer"
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
                  className="input-with-spacer"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="form-actions">
                <button type="submit">Save Credentials</button>
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
