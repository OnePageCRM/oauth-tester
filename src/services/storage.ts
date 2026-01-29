import type { AppState, Flow } from '../types'

const STORAGE_KEY = 'oauth_tester_state'
const CALLBACK_KEY = 'oauth_callback'

// Default state
const defaultState: AppState = {
  flows: [],
  activeFlowId: null,
}

// Load state from localStorage
export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return defaultState
    }
    return JSON.parse(stored) as AppState
  } catch {
    console.error('Failed to load state from localStorage')
    return defaultState
  }
}

// Save state to localStorage
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save state to localStorage', e)
  }
}

// Get all flows sorted by lastModified (most recent first)
export function getFlows(state: AppState): Flow[] {
  return [...state.flows].sort((a, b) => b.lastModified - a.lastModified)
}

// Get a single flow by ID
export function getFlow(state: AppState, flowId: string): Flow | undefined {
  return state.flows.find((f) => f.id === flowId)
}

// OAuth callback data (set by callback.html)
export interface CallbackData {
  code: string | null
  state: string | null
  error: string | null
  error_description: string | null
  timestamp: number
}

// Check for pending OAuth callback
export function getCallbackData(): CallbackData | null {
  try {
    const stored = localStorage.getItem(CALLBACK_KEY)
    if (!stored) {
      return null
    }
    return JSON.parse(stored) as CallbackData
  } catch {
    return null
  }
}

// Clear callback data after processing
export function clearCallbackData(): void {
  localStorage.removeItem(CALLBACK_KEY)
}

// Save pre-redirect state (for callback.html to restore)
const REDIRECT_STATE_KEY = 'oauth_redirect_state'

export interface RedirectState {
  flowId: string
  codeVerifier: string
  state: string
}

export function saveRedirectState(data: RedirectState): void {
  localStorage.setItem(REDIRECT_STATE_KEY, JSON.stringify(data))
}

export function getRedirectState(): RedirectState | null {
  try {
    const stored = localStorage.getItem(REDIRECT_STATE_KEY)
    if (!stored) {
      return null
    }
    return JSON.parse(stored) as RedirectState
  } catch {
    return null
  }
}

export function clearRedirectState(): void {
  localStorage.removeItem(REDIRECT_STATE_KEY)
}
