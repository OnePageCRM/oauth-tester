import type { AppState, Flow } from '../types'

export type Action =
  | { type: 'CREATE_FLOW'; name?: string }
  | { type: 'DELETE_FLOW'; flowId: string }
  | { type: 'SET_ACTIVE_FLOW'; flowId: string | null }
  | { type: 'RENAME_FLOW'; flowId: string; name: string }
  | { type: 'FORK_FLOW'; flowId: string; stepIndex: number; newName?: string }
  | { type: 'UPDATE_FLOW'; flowId: string; updates: Partial<Flow> }

export interface AppContextValue {
  state: AppState
  flows: Flow[]
  activeFlow: Flow | undefined
  dispatch: React.Dispatch<Action>
}
