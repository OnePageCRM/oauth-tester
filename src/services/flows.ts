import type { AppState, Flow, Step, StartStep } from '../types'

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Create a new empty flow
export function createFlow(state: AppState, name?: string): { state: AppState; flow: Flow } {
  const flowNumber = state.flows.length + 1
  const now = Date.now()

  const initialStep: StartStep = {
    id: generateId(),
    type: 'start',
    status: 'pending',
  }

  const flow: Flow = {
    id: generateId(),
    name: name ?? `Flow #${flowNumber}`,
    createdAt: now,
    lastModified: now,
    steps: [initialStep],
  }

  const newState: AppState = {
    ...state,
    flows: [...state.flows, flow],
    activeFlowId: flow.id,
  }

  return { state: newState, flow }
}

// Update a flow
export function updateFlow(state: AppState, flowId: string, updates: Partial<Flow>): AppState {
  return {
    ...state,
    flows: state.flows.map((f) =>
      f.id === flowId
        ? {
            ...f,
            ...updates,
            lastModified: Date.now(),
          }
        : f
    ),
  }
}

// Delete a flow
export function deleteFlow(state: AppState, flowId: string): AppState {
  const newFlows = state.flows.filter((f) => f.id !== flowId)
  return {
    ...state,
    flows: newFlows,
    activeFlowId: state.activeFlowId === flowId ? null : state.activeFlowId,
  }
}

// Set active flow
export function setActiveFlow(state: AppState, flowId: string | null): AppState {
  return {
    ...state,
    activeFlowId: flowId,
  }
}

// Update flow name
export function renameFlow(state: AppState, flowId: string, name: string): AppState {
  return updateFlow(state, flowId, { name })
}

// Add a step to a flow
export function addStep(state: AppState, flowId: string, step: Step): AppState {
  const flow = state.flows.find((f) => f.id === flowId)
  if (!flow) return state

  return updateFlow(state, flowId, {
    steps: [...flow.steps, step],
  })
}

// Update a step in a flow
export function updateStep(
  state: AppState,
  flowId: string,
  stepId: string,
  updates: Partial<Step>
): AppState {
  const flow = state.flows.find((f) => f.id === flowId)
  if (!flow) return state

  return updateFlow(state, flowId, {
    steps: flow.steps.map((s) => (s.id === stepId ? ({ ...s, ...updates } as Step) : s)),
  })
}

// Fork a flow from a specific step
export function forkFlow(
  state: AppState,
  flowId: string,
  stepIndex: number,
  newName?: string
): { state: AppState; flow: Flow } | null {
  const sourceFlow = state.flows.find((f) => f.id === flowId)
  if (!sourceFlow || stepIndex < 0 || stepIndex >= sourceFlow.steps.length) {
    return null
  }

  const flowNumber = state.flows.length + 1
  const now = Date.now()

  // Copy steps up to and including the fork point
  const copiedSteps = sourceFlow.steps.slice(0, stepIndex + 1).map((step, idx) => ({
    ...step,
    id: generateId(), // New IDs for copied steps
    // Set the last step (forked step) to pending so it's in edit mode
    status: idx === stepIndex ? 'pending' : step.status,
  }))

  const forkedFlow: Flow = {
    id: generateId(),
    name: newName ?? `Flow #${flowNumber}`,
    createdAt: now,
    lastModified: now,
    parentFlowId: flowId,
    parentStepIndex: stepIndex,
    steps: copiedSteps as Step[],
    // Copy accumulated state
    serverUrl: sourceFlow.serverUrl,
    metadata: sourceFlow.metadata ? { ...sourceFlow.metadata } : undefined,
    credentials: sourceFlow.credentials ? { ...sourceFlow.credentials } : undefined,
    tokens: sourceFlow.tokens ? { ...sourceFlow.tokens } : undefined,
  }

  const newState: AppState = {
    ...state,
    flows: [...state.flows, forkedFlow],
    activeFlowId: forkedFlow.id,
  }

  return { state: newState, flow: forkedFlow }
}

// Update accumulated flow state (called after step completion)
export function updateFlowState(
  state: AppState,
  flowId: string,
  flowUpdates: Partial<Pick<Flow, 'serverUrl' | 'metadata' | 'credentials' | 'tokens'>>
): AppState {
  return updateFlow(state, flowId, flowUpdates)
}
