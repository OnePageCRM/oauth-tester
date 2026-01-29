import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadState,
  saveState,
  getFlows,
  getFlow,
  getCallbackData,
  clearCallbackData,
  saveRedirectState,
  getRedirectState,
  clearRedirectState,
} from './storage'
import type { AppState, Flow } from '../types'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadState', () => {
    it('returns default state when localStorage is empty', () => {
      const state = loadState()
      expect(state.flows).toEqual([])
      expect(state.activeFlowId).toBeNull()
    })

    it('returns stored state', () => {
      const stored: AppState = {
        flows: [],
        activeFlowId: 'test-id',
      }
      localStorage.setItem('oauth_tester_state', JSON.stringify(stored))

      const state = loadState()
      expect(state.activeFlowId).toBe('test-id')
    })
  })

  describe('saveState', () => {
    it('saves state to localStorage', () => {
      const state: AppState = {
        flows: [],
        activeFlowId: 'test-id',
      }
      saveState(state)

      const stored = localStorage.getItem('oauth_tester_state')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored ?? '{}').activeFlowId).toBe('test-id')
    })
  })

  describe('getFlows', () => {
    it('returns flows sorted by lastModified (most recent first)', () => {
      const state: AppState = {
        flows: [
          { id: '1', lastModified: 100 } as Flow,
          { id: '2', lastModified: 300 } as Flow,
          { id: '3', lastModified: 200 } as Flow,
        ],
        activeFlowId: null,
      }

      const flows = getFlows(state)
      expect(flows.map((f) => f.id)).toEqual(['2', '3', '1'])
    })
  })

  describe('getFlow', () => {
    it('returns flow by id', () => {
      const state: AppState = {
        flows: [{ id: 'test', name: 'Test Flow' } as Flow],
        activeFlowId: null,
      }

      const flow = getFlow(state, 'test')
      expect(flow?.name).toBe('Test Flow')
    })

    it('returns undefined for unknown id', () => {
      const state: AppState = { flows: [], activeFlowId: null }
      expect(getFlow(state, 'unknown')).toBeUndefined()
    })
  })

  describe('callback data', () => {
    it('returns null when no callback data', () => {
      expect(getCallbackData()).toBeNull()
    })

    it('returns callback data when present', () => {
      const data = {
        code: 'auth_code',
        state: 'state123',
        error: null,
        error_description: null,
        timestamp: 12345,
      }
      localStorage.setItem('oauth_callback', JSON.stringify(data))

      const result = getCallbackData()
      expect(result?.code).toBe('auth_code')
    })

    it('clears callback data', () => {
      localStorage.setItem('oauth_callback', '{}')
      clearCallbackData()
      expect(localStorage.getItem('oauth_callback')).toBeNull()
    })
  })

  describe('redirect state', () => {
    it('saves and retrieves redirect state', () => {
      const data = {
        flowId: 'flow-1',
        codeVerifier: 'verifier123',
        state: 'state456',
      }
      saveRedirectState(data)

      const result = getRedirectState()
      expect(result).toEqual(data)
    })

    it('clears redirect state', () => {
      saveRedirectState({ flowId: 'f', codeVerifier: 'v', state: 's' })
      clearRedirectState()
      expect(getRedirectState()).toBeNull()
    })
  })
})
