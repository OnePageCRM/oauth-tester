import { useState, type ReactNode } from 'react'
import type { Step, HttpExchange } from '../../types'
import './StepBase.css'

interface StepBaseProps {
  step: Step
  index: number
  title: string
  onFork: () => void
  children: ReactNode
}

export function StepBase({ step, index, title, onFork, children }: StepBaseProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className={`step step-${step.status}`}>
      <div className="step-header">
        <span className="step-number">{index + 1}</span>
        <span className="step-title">{title}</span>
        <span className={`step-status status-${step.status}`}>{formatStatus(step.status)}</span>
        <button className="step-fork" onClick={onFork} title="Fork from this step">
          Fork
        </button>
      </div>

      <div className="step-content">{children}</div>

      {step.error && <div className="step-error">{step.error}</div>}

      {step.httpExchange && (
        <div className="step-details-toggle">
          <button onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>
      )}

      {showDetails && step.httpExchange && <HttpExchangeDetails exchange={step.httpExchange} />}
    </div>
  )
}

function formatStatus(status: Step['status']): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function HttpExchangeDetails({ exchange }: { exchange: HttpExchange }) {
  return (
    <div className="http-exchange">
      <div className="http-section">
        <div className="http-section-title">Request</div>
        <div className="http-details">
          <div className="http-line">
            <strong>{exchange.request.method}</strong> {exchange.request.url}
          </div>
          {Object.entries(exchange.request.headers).map(([key, value]) => (
            <div key={key} className="http-header">
              {key}: {value}
            </div>
          ))}
          {exchange.request.body && (
            <pre className="http-body">{formatBody(exchange.request.body)}</pre>
          )}
        </div>
      </div>

      {exchange.response && (
        <div className="http-section">
          <div className="http-section-title">Response</div>
          <div className="http-details">
            <div className="http-line">
              <strong>{exchange.response.status}</strong> {exchange.response.statusText}
            </div>
            {Object.entries(exchange.response.headers).map(([key, value]) => (
              <div key={key} className="http-header">
                {key}: {value}
              </div>
            ))}
            {exchange.response.body && (
              <pre className="http-body">{formatBody(exchange.response.body)}</pre>
            )}
          </div>
        </div>
      )}

      {exchange.error && (
        <div className="http-section">
          <div className="http-section-title http-section-error">Error</div>
          <div className="http-error">{exchange.error}</div>
        </div>
      )}
    </div>
  )
}

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}
