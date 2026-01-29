import { useState } from 'react'
import type { StartStep as StartStepType } from '../../types'
import { StepBase } from './StepBase'
import './StepForms.css'

interface StartStepProps {
  step: StartStepType
  index: number
  onFork: () => void
  onSubmit: (serverUrl: string) => void
}

export function StartStep({ step, index, onFork, onSubmit }: StartStepProps) {
  const [url, setUrl] = useState(step.serverUrl ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (trimmed) {
      onSubmit(trimmed)
    }
  }

  const isComplete = step.status === 'complete'

  return (
    <StepBase step={step} index={index} title="Start" onFork={onFork}>
      {isComplete ? (
        <div className="metadata-grid">
          <div className="metadata-item">
            <label>Server URL</label>
            <div className="step-value">{step.serverUrl}</div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="step-form">
          <div className="form-row">
            <label htmlFor="server-url">Server URL</label>
            <input
              id="server-url"
              type="url"
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
          </div>
        </form>
      )}
    </StepBase>
  )
}
