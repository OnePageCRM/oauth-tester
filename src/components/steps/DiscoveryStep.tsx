import { useState } from 'react'
import type { DiscoveryStep as DiscoveryStepType, ServerMetadata } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface DiscoveryStepProps {
  step: DiscoveryStepType
  index: number
  onFork: () => void
  onDiscover: (useProxy: boolean) => void
  onReset: () => void
}

// Convert snake_case to Title Case
function formatLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Format value for display
function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }
  return String(value)
}

export function DiscoveryStep({ step, index, onFork, onDiscover, onReset }: DiscoveryStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  // Default: browser (false = no proxy) - discovery typically works from browser
  const [useProxy, setUseProxy] = useState(false)

  const isComplete = step.status === 'complete'
  const isPending = step.status === 'pending'
  const isError = step.status === 'error'

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleRefetch = () => {
    onReset()
    onDiscover(useProxy)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleDiscover = () => {
    onDiscover(useProxy)
  }

  const showForm = isPending || isError || isEditing

  // Priority order for metadata fields
  const fieldOrder = [
    'issuer',
    'registration_endpoint',
    'authorization_endpoint',
    'token_endpoint',
    'grant_types_supported',
    'response_types_supported',
    'token_endpoint_auth_methods_supported',
    'code_challenge_methods_supported',
  ]

  // Get all metadata entries to display in priority order
  const getMetadataEntries = (metadata: ServerMetadata) => {
    const entries = Object.entries(metadata).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )

    // Sort by priority order, then alphabetically for remaining fields
    return entries.sort(([keyA], [keyB]) => {
      const indexA = fieldOrder.indexOf(keyA)
      const indexB = fieldOrder.indexOf(keyB)

      // Both in priority list - sort by priority
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      // Only A in priority list - A comes first
      if (indexA !== -1) return -1
      // Only B in priority list - B comes first
      if (indexB !== -1) return 1
      // Neither in priority list - alphabetical
      return keyA.localeCompare(keyB)
    })
  }

  return (
    <StepBase
      step={step}
      index={index}
      title="Discovery"
      onFork={onFork}
      onReset={isComplete && !isEditing ? handleEdit : undefined}
    >
      {isComplete && step.metadata && !isEditing ? (
        <div className="metadata-grid">
          {getMetadataEntries(step.metadata).map(([key, value]) => (
            <div key={key} className="metadata-item">
              <label>{formatLabel(key)}</label>
              <div className="step-value">{formatValue(value)}</div>
            </div>
          ))}
          {step.httpExchange?.request.url && (
            <div className="metadata-item">
              <label>Discovery URL</label>
              <div className="step-value" style={{ wordBreak: 'break-all' }}>
                {step.httpExchange.request.url}
              </div>
            </div>
          )}
        </div>
      ) : showForm ? (
        <div className="step-form">
          <div className="fetch-mode-row">
            <label>Fetch Via</label>
            <div className="fetch-mode-toggle">
              <button
                type="button"
                className={!useProxy ? 'active' : ''}
                onClick={() => setUseProxy(false)}
              >
                Browser
              </button>
              <button
                type="button"
                className={useProxy ? 'active' : ''}
                onClick={() => setUseProxy(true)}
              >
                Backend
              </button>
            </div>
          </div>
          <div className="form-actions" style={{ marginLeft: 0 }}>
            {isEditing ? (
              <>
                <button onClick={handleRefetch}>Re-fetch Metadata</button>
                <button type="button" className="secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={handleDiscover}>Fetch Metadata</button>
            )}
          </div>
        </div>
      ) : (
        <div className="step-loading">Fetching metadata...</div>
      )}
    </StepBase>
  )
}
