import { useApp } from '../context/AppContext'
import { FlowName } from './FlowName'
import './FlowView.css'

export function FlowView() {
  const { activeFlow, dispatch } = useApp()

  if (!activeFlow) {
    return (
      <div className="flow-view-empty">
        <p>Select a flow from the sidebar or create a new one</p>
      </div>
    )
  }

  const handleRename = (newName: string) => {
    dispatch({ type: 'RENAME_FLOW', flowId: activeFlow.id, name: newName })
  }

  const handleFork = (stepIndex: number) => {
    dispatch({ type: 'FORK_FLOW', flowId: activeFlow.id, stepIndex })
  }

  return (
    <div className="flow-view">
      <div className="flow-view-header">
        <FlowName name={activeFlow.name} onRename={handleRename} />
      </div>
      <div className="flow-view-steps">
        {activeFlow.steps.map((step, index) => (
          <div key={step.id} className={`flow-step flow-step-${step.status}`}>
            <div className="flow-step-header">
              <span className="flow-step-number">{index + 1}</span>
              <span className="flow-step-type">{step.type}</span>
              <span className={`flow-step-status status-${step.status}`}>{step.status}</span>
              <button
                className="flow-step-fork"
                onClick={() => handleFork(index)}
                title="Fork from this step"
              >
                Fork
              </button>
            </div>
            <div className="flow-step-content">
              {/* Step-specific content will be added in Phase 4 */}
              <p className="flow-step-placeholder">Step content placeholder</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
