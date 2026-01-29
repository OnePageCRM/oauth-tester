import { describe, it, expect } from 'vitest'
import {
  createFlow,
  updateFlow,
  deleteFlow,
  setActiveFlow,
  renameFlow,
  addStep,
  updateStep,
  forkFlow,
} from './flows'
import type { AppState, DiscoveryStep } from '../types'

const emptyState: AppState = {
  flows: [],
  activeFlowId: null,
}

describe('flows', () => {
  describe('createFlow', () => {
    it('creates a new flow with default name', () => {
      const { state, flow } = createFlow(emptyState)

      expect(flow.name).toBe('Flow #1')
      expect(flow.steps).toHaveLength(1)
      expect(flow.steps[0].type).toBe('start')
      expect(flow.steps[0].status).toBe('pending')
      expect(state.flows).toHaveLength(1)
      expect(state.activeFlowId).toBe(flow.id)
    })

    it('creates flow with custom name', () => {
      const { flow } = createFlow(emptyState, 'My Custom Flow')
      expect(flow.name).toBe('My Custom Flow')
    })

    it('increments flow number', () => {
      const { state: state1 } = createFlow(emptyState)
      const { flow: flow2 } = createFlow(state1)
      expect(flow2.name).toBe('Flow #2')
    })
  })

  describe('updateFlow', () => {
    it('updates flow and sets lastModified', () => {
      const { state, flow } = createFlow(emptyState)
      const originalLastModified = flow.lastModified

      // Small delay to ensure timestamp differs
      const newState = updateFlow(state, flow.id, { name: 'Updated' })
      const updated = newState.flows.find((f) => f.id === flow.id)

      expect(updated?.name).toBe('Updated')
      expect(updated?.lastModified).toBeGreaterThanOrEqual(originalLastModified)
    })
  })

  describe('deleteFlow', () => {
    it('removes flow from state', () => {
      const { state, flow } = createFlow(emptyState)
      const newState = deleteFlow(state, flow.id)

      expect(newState.flows).toHaveLength(0)
    })

    it('clears activeFlowId if deleted flow was active', () => {
      const { state, flow } = createFlow(emptyState)
      const newState = deleteFlow(state, flow.id)

      expect(newState.activeFlowId).toBeNull()
    })
  })

  describe('setActiveFlow', () => {
    it('sets active flow id', () => {
      const newState = setActiveFlow(emptyState, 'some-id')
      expect(newState.activeFlowId).toBe('some-id')
    })
  })

  describe('renameFlow', () => {
    it('renames a flow', () => {
      const { state, flow } = createFlow(emptyState)
      const newState = renameFlow(state, flow.id, 'New Name')
      const updated = newState.flows.find((f) => f.id === flow.id)

      expect(updated?.name).toBe('New Name')
    })
  })

  describe('addStep', () => {
    it('adds a step to flow', () => {
      const { state, flow } = createFlow(emptyState)
      const newStep: DiscoveryStep = {
        id: 'step-2',
        type: 'discovery',
        status: 'pending',
      }

      const newState = addStep(state, flow.id, newStep)
      const updated = newState.flows.find((f) => f.id === flow.id)

      expect(updated?.steps).toHaveLength(2)
      expect(updated?.steps[1].type).toBe('discovery')
    })
  })

  describe('updateStep', () => {
    it('updates a step in flow', () => {
      const { state, flow } = createFlow(emptyState)
      const stepId = flow.steps[0].id

      const newState = updateStep(state, flow.id, stepId, { status: 'complete' })
      const updated = newState.flows.find((f) => f.id === flow.id)

      expect(updated?.steps[0].status).toBe('complete')
    })
  })

  describe('forkFlow', () => {
    it('creates a fork with steps up to fork point', () => {
      const { state: state1, flow: flow1 } = createFlow(emptyState)

      // Add more steps
      const step2: DiscoveryStep = { id: 's2', type: 'discovery', status: 'complete' }
      const step3: DiscoveryStep = { id: 's3', type: 'discovery', status: 'pending' }
      let state2 = addStep(state1, flow1.id, step2)
      state2 = addStep(state2, flow1.id, step3)

      // Fork at step index 1 (includes steps 0 and 1)
      const result = forkFlow(state2, flow1.id, 1)

      expect(result).not.toBeNull()
      expect(result?.flow.steps).toHaveLength(2)
      expect(result?.flow.parentFlowId).toBe(flow1.id)
      expect(result?.flow.parentStepIndex).toBe(1)
      expect(result?.state.activeFlowId).toBe(result?.flow.id)
    })

    it('copies accumulated state', () => {
      const { state: initialState, flow } = createFlow(emptyState)
      const state = updateFlow(initialState, flow.id, {
        serverUrl: 'https://example.com',
        credentials: { client_id: 'test-client' },
      })

      const result = forkFlow(state, flow.id, 0)

      expect(result?.flow.serverUrl).toBe('https://example.com')
      expect(result?.flow.credentials?.client_id).toBe('test-client')
    })

    it('returns null for invalid step index', () => {
      const { state, flow } = createFlow(emptyState)
      expect(forkFlow(state, flow.id, 99)).toBeNull()
      expect(forkFlow(state, flow.id, -1)).toBeNull()
    })

    it('returns null for unknown flow', () => {
      expect(forkFlow(emptyState, 'unknown', 0)).toBeNull()
    })

    it('generates new IDs for copied steps', () => {
      const { state, flow } = createFlow(emptyState)
      const originalStepId = flow.steps[0].id

      const result = forkFlow(state, flow.id, 0)

      expect(result?.flow.steps[0].id).not.toBe(originalStepId)
    })
  })
})
