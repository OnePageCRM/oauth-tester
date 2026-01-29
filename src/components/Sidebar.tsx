import { useApp } from '../context/AppContext'
import './Sidebar.css'

export function Sidebar() {
  const { flows, activeFlow, dispatch } = useApp()

  const handleNewFlow = () => {
    dispatch({ type: 'CREATE_FLOW' })
  }

  const handleSelectFlow = (flowId: string) => {
    dispatch({ type: 'SET_ACTIVE_FLOW', flowId })
  }

  const handleDeleteFlow = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation()
    dispatch({ type: 'DELETE_FLOW', flowId })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-flow-btn" onClick={handleNewFlow}>
          + New Flow
        </button>
      </div>
      <div className="sidebar-flows">
        {flows.length === 0 ? (
          <div className="sidebar-empty">No flows yet</div>
        ) : (
          flows.map((flow) => (
            <div
              key={flow.id}
              className={`sidebar-flow ${activeFlow?.id === flow.id ? 'active' : ''}`}
              onClick={() => handleSelectFlow(flow.id)}
            >
              <div className="sidebar-flow-name">{flow.name}</div>
              <div className="sidebar-flow-meta">
                <span className="sidebar-flow-date">{formatDate(flow.lastModified)}</span>
                <button
                  className="sidebar-flow-delete"
                  onClick={(e) => handleDeleteFlow(e, flow.id)}
                  title="Delete flow"
                >
                  x
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
