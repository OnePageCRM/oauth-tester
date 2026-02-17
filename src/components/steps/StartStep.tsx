import { useState } from 'react'
import type { StartStep as StartStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface StartStepProps {
  step: StartStepType
  index: number
  onFork: () => void
  onSubmit: (serverUrl: string) => void
  onReset: () => void
  onRestart?: () => void
}

export function StartStep({ step, index, onFork, onSubmit, onReset, onRestart }: StartStepProps) {
  const [url, setUrl] = useState(step.serverUrl ?? '')
  const [isEditing, setIsEditing] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (trimmed) {
      // Only reset if value changed
      if (trimmed !== step.serverUrl) {
        onReset()
      }
      onSubmit(trimmed)
      setIsEditing(false)
    }
  }

  const handleEdit = () => {
    setUrl(step.serverUrl ?? '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setUrl(step.serverUrl ?? '')
    setIsEditing(false)
  }

  const isComplete = step.status === 'complete'
  const showForm = !isComplete || isEditing

  return (
    <StepBase
      step={step}
      index={index}
      title="Start"
      onFork={onFork}
      onReset={isComplete && !isEditing ? handleEdit : undefined}
      onRestart={isComplete && !isEditing ? onRestart : undefined}
    >
      {showForm ? (
        <form onSubmit={handleSubmit} className="step-form">
          <div className="form-row">
            <label htmlFor="server-url">Server URL</label>
            <input
              id="server-url"
              type="url"
              className="input-with-spacer"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://auth.example.com"
              disabled={step.status === 'in_progress'}
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={!url.trim() || step.status === 'in_progress'}>
              {step.status === 'in_progress' ? 'Loading...' : 'Continue'}
            </button>
            {isEditing && (
              <button type="button" className="secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="metadata-grid">
          <div className="metadata-item">
            <label>Server URL</label>
            <div className="step-value">{step.serverUrl}</div>
          </div>
        </div>
      )}
    </StepBase>
  )
}
