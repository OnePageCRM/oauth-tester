import { useReducer, useEffect, type ReactNode } from 'react'
import type { AppState } from '../types'
import { loadState, saveState, getFlows, getFlow } from '../services/storage'
import {
  createFlow,
  deleteFlow,
  setActiveFlow,
  renameFlow,
  forkFlow,
  updateFlow,
  addStep,
  updateStep,
} from '../services/flows'
import type { Action } from './types'
import { AppContext } from './context'

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
    case 'UPDATE_STEP':
      return updateStep(state, action.flowId, action.stepId, action.updates)
    case 'ADD_STEP':
      return addStep(state, action.flowId, action.step)
    default:
      return state
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)

  // Save to localStorage on state change
  useEffect(() => {
    saveState(state)
  }, [state])

  const value = {
    state,
    flows: getFlows(state),
    activeFlow: state.activeFlowId ? getFlow(state, state.activeFlowId) : undefined,
    dispatch,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
