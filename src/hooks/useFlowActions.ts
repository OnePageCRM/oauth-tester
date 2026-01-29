import { useCallback } from 'react'
import { useApp } from '../context/useApp'
import { generateId } from '../services/flows'
import { discoverMetadata, FetchError } from '../services/oauth'
import type { Flow, Step, DiscoveryStep, RegistrationStep } from '../types'

export function useFlowActions() {
  const { activeFlow, dispatch } = useApp()

  const updateStep = useCallback(
    (stepId: string, updates: Partial<Step>) => {
      if (!activeFlow) return
      dispatch({
        type: 'UPDATE_STEP',
        flowId: activeFlow.id,
        stepId,
        updates,
      })
    },
    [activeFlow, dispatch]
  )

  const updateFlow = useCallback(
    (updates: Partial<Flow>) => {
      if (!activeFlow) return
      dispatch({
        type: 'UPDATE_FLOW',
        flowId: activeFlow.id,
        updates,
      })
    },
    [activeFlow, dispatch]
  )

  const addStep = useCallback(
    (step: Step) => {
      if (!activeFlow) return
      dispatch({
        type: 'ADD_STEP',
        flowId: activeFlow.id,
        step,
      })
    },
    [activeFlow, dispatch]
  )

  // Remove steps after a given index (for reset)
  const truncateSteps = useCallback(
    (afterIndex: number) => {
      if (!activeFlow) return
      const newSteps = activeFlow.steps.slice(0, afterIndex + 1)
      updateFlow({ steps: newSteps })
    },
    [activeFlow, updateFlow]
  )

  // Reset Start step - removes all subsequent steps
  const handleResetStart = useCallback(() => {
    if (!activeFlow) return
    const startStep = activeFlow.steps.find((s) => s.type === 'start')
    if (!startStep) return

    // Reset to pending, clear data
    updateStep(startStep.id, {
      status: 'pending',
      completedAt: undefined,
    } as Partial<Step>)

    // Remove all steps after start
    truncateSteps(0)

    // Clear flow state
    updateFlow({
      serverUrl: undefined,
      metadata: undefined,
      credentials: undefined,
      pkce: undefined,
      tokens: undefined,
    })
  }, [activeFlow, updateStep, updateFlow, truncateSteps])

  // Reset Discovery step - removes all subsequent steps
  const handleResetDiscovery = useCallback(() => {
    if (!activeFlow) return
    const discoveryIndex = activeFlow.steps.findIndex((s) => s.type === 'discovery')
    if (discoveryIndex === -1) return

    const discoveryStep = activeFlow.steps[discoveryIndex]

    // Reset to pending
    updateStep(discoveryStep.id, {
      status: 'pending',
      metadata: undefined,
      httpExchange: undefined,
      completedAt: undefined,
      error: undefined,
    } as Partial<Step>)

    // Remove all steps after discovery
    truncateSteps(discoveryIndex)

    // Clear flow state that depends on discovery
    updateFlow({
      metadata: undefined,
      credentials: undefined,
      pkce: undefined,
      tokens: undefined,
    })
  }, [activeFlow, updateStep, updateFlow, truncateSteps])

  // Handle Start step submission
  const handleStartSubmit = useCallback(
    async (serverUrl: string) => {
      if (!activeFlow) return

      const startStep = activeFlow.steps.find((s) => s.type === 'start')
      if (!startStep) return

      // Mark step as complete
      updateStep(startStep.id, {
        status: 'complete',
        serverUrl,
        completedAt: Date.now(),
      } as Partial<Step>)

      // Update flow state
      updateFlow({ serverUrl })

      // Add discovery step
      const discoveryStep: DiscoveryStep = {
        id: generateId(),
        type: 'discovery',
        status: 'pending',
      }
      addStep(discoveryStep)
    },
    [activeFlow, updateStep, updateFlow, addStep]
  )

  // Handle Discovery step
  const handleDiscover = useCallback(async () => {
    if (!activeFlow?.serverUrl) return

    const discoveryStep = activeFlow.steps.find((s) => s.type === 'discovery')
    if (!discoveryStep) return

    // Mark as in progress
    updateStep(discoveryStep.id, { status: 'in_progress' })

    try {
      const { metadata, exchange } = await discoverMetadata(activeFlow.serverUrl)

      // Mark as complete with metadata
      updateStep(discoveryStep.id, {
        status: 'complete',
        metadata,
        httpExchange: exchange,
        completedAt: Date.now(),
      } as Partial<Step>)

      // Update flow state
      updateFlow({ metadata })

      // Add registration step
      const registrationStep: RegistrationStep = {
        id: generateId(),
        type: 'registration',
        status: 'pending',
        mode: metadata.registration_endpoint ? 'dynamic' : 'manual',
      }
      addStep(registrationStep)
    } catch (error) {
      const exchange = error instanceof FetchError ? error.exchange : undefined
      updateStep(discoveryStep.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Discovery failed',
        httpExchange: exchange,
      } as Partial<Step>)
    }
  }, [activeFlow, updateStep, updateFlow, addStep])

  return {
    handleStartSubmit,
    handleDiscover,
    handleResetStart,
    handleResetDiscovery,
  }
}
