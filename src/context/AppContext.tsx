import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { AppState, Flow } from '../types'
import { loadState, saveState, getFlows, getFlow } from '../services/storage'
import {
  createFlow,
  deleteFlow,
  setActiveFlow,
  renameFlow,
  forkFlow,
  updateFlow,
} from '../services/flows'

type Action =
  | { type: 'CREATE_FLOW'; name?: string }
  | { type: 'DELETE_FLOW'; flowId: string }
  | { type: 'SET_ACTIVE_FLOW'; flowId: string | null }
  | { type: 'RENAME_FLOW'; flowId: string; name: string }
  | { type: 'FORK_FLOW'; flowId: string; stepIndex: number; newName?: string }
  | { type: 'UPDATE_FLOW'; flowId: string; updates: Partial<Flow> }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CREATE_FLOW': {
      const { state: newState } = createFlow(state, action.name)
      return newState
    }
    case 'DELETE_FLOW':
      return deleteFlow(state, action.flowId)
    case 'SET_ACTIVE_FLOW':
      return setActiveFlow(state, action.flowId)
    case 'RENAME_FLOW':
      return renameFlow(state, action.flowId, action.name)
    case 'FORK_FLOW': {
      const result = forkFlow(state, action.flowId, action.stepIndex, action.newName)
      return result ? result.state : state
    }
    case 'UPDATE_FLOW':
      return updateFlow(state, action.flowId, action.updates)
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  flows: Flow[]
  activeFlow: Flow | undefined
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)

  // Save to localStorage on state change
  useEffect(() => {
    saveState(state)
  }, [state])

  const value: AppContextValue = {
    state,
    flows: getFlows(state),
    activeFlow: state.activeFlowId ? getFlow(state, state.activeFlowId) : undefined,
    dispatch,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
