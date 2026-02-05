import { useEffect, useRef } from 'react'
import { useApp } from '../context/useApp'
import {
  getCallbackData,
  clearCallbackData,
  getRedirectState,
  clearRedirectState,
} from '../services/storage'
import { generateId } from '../services/flows'
import type { Step, TokenStep } from '../types'

export function useCallbackHandler() {
  const { state, dispatch } = useApp()
  const processedRef = useRef(false)

  useEffect(() => {
    // Only process once
    if (processedRef.current) return

    const callbackData = getCallbackData()
    if (!callbackData) return

    const redirectState = getRedirectState()
    if (!redirectState) {
      // No redirect state - clear callback and ignore
      clearCallbackData()
      return
    }

    processedRef.current = true

    // Find the flow
    const flow = state.flows.find((f) => f.id === redirectState.flowId)
    if (!flow) {
      clearCallbackData()
      clearRedirectState()
      return
    }

    // Find the callback step
    const callbackStep = flow.steps.find((s) => s.type === 'callback')
    if (!callbackStep) {
      clearCallbackData()
      clearRedirectState()
      return
    }

    // Set this flow as active
    dispatch({ type: 'SET_ACTIVE_FLOW', flowId: flow.id })

    // Common callback data to store regardless of outcome
    const commonCallbackData = {
      state: callbackData.state ?? undefined,
      iss: callbackData.iss ?? undefined,
      extraParams: callbackData.extraParams ?? undefined,
      callbackUrl: callbackData.callbackUrl,
    }

    // Verify state matches
    if (callbackData.state !== redirectState.state) {
      dispatch({
        type: 'UPDATE_STEP',
        flowId: flow.id,
        stepId: callbackStep.id,
        updates: {
          status: 'error',
          error: 'State mismatch - possible CSRF attack',
          ...commonCallbackData,
        } as Partial<Step>,
      })
      clearCallbackData()
      clearRedirectState()
      return
    }

    // Check for OAuth error
    if (callbackData.error) {
      dispatch({
        type: 'UPDATE_STEP',
        flowId: flow.id,
        stepId: callbackStep.id,
        updates: {
          status: 'error',
          error: callbackData.error,
          errorDescription: callbackData.error_description ?? undefined,
          ...commonCallbackData,
        } as Partial<Step>,
      })
      clearCallbackData()
      clearRedirectState()
      return
    }

    // Success - we have an authorization code
    if (callbackData.code) {
      dispatch({
        type: 'UPDATE_STEP',
        flowId: flow.id,
        stepId: callbackStep.id,
        updates: {
          status: 'complete',
          code: callbackData.code,
          completedAt: Date.now(),
          ...commonCallbackData,
        } as Partial<Step>,
      })

      // Update authorization step with codeVerifier from redirect state (if needed)
      const authStep = flow.steps.find((s) => s.type === 'authorization')
      if (authStep && !authStep.codeVerifier) {
        dispatch({
          type: 'UPDATE_STEP',
          flowId: flow.id,
          stepId: authStep.id,
          updates: {
            codeVerifier: redirectState.codeVerifier,
          },
        })
      }

      // Add token step
      const tokenStep: TokenStep = {
        id: generateId(),
        type: 'token',
        status: 'pending',
      }
      dispatch({
        type: 'ADD_STEP',
        flowId: flow.id,
        step: tokenStep,
      })
    }

    // Clean up
    clearCallbackData()
    clearRedirectState()
  }, [state.flows, dispatch])
}
