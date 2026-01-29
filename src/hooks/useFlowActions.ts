import { useCallback } from 'react'
import { useApp } from '../context/useApp'
import { generateId } from '../services/flows'
import {
  discoverMetadata,
  registerClient,
  buildAuthorizationUrl,
  getCallbackUrl,
  FetchError,
} from '../services/oauth'
import { generatePKCE, generateState } from '../services/pkce'
import { saveRedirectState } from '../services/storage'
import type {
  Flow,
  Step,
  DiscoveryStep,
  RegistrationStep,
  AuthorizationStep,
  CallbackStep,
  ClientCredentials,
  RegistrationRequest,
} from '../types'

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

      // Mark as complete with metadata (clear any previous error)
      updateStep(discoveryStep.id, {
        status: 'complete',
        metadata,
        httpExchange: exchange,
        completedAt: Date.now(),
        error: undefined,
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

  // Reset Registration step
  const handleResetRegistration = useCallback(() => {
    if (!activeFlow) return
    const registrationIndex = activeFlow.steps.findIndex((s) => s.type === 'registration')
    if (registrationIndex === -1) return

    const registrationStep = activeFlow.steps[registrationIndex]

    // Reset to pending
    updateStep(registrationStep.id, {
      status: 'pending',
      credentials: undefined,
      httpExchange: undefined,
      completedAt: undefined,
      error: undefined,
    } as Partial<Step>)

    // Remove all steps after registration
    truncateSteps(registrationIndex)

    // Clear flow state that depends on registration
    updateFlow({
      credentials: undefined,
      pkce: undefined,
      tokens: undefined,
    })
  }, [activeFlow, updateStep, updateFlow, truncateSteps])

  // Handle Dynamic Registration
  const handleRegister = useCallback(
    async (registrationRequest: RegistrationRequest) => {
      if (!activeFlow?.metadata?.registration_endpoint) return

      const registrationStep = activeFlow.steps.find((s) => s.type === 'registration')
      if (!registrationStep) return

      // Mark as in progress
      updateStep(registrationStep.id, { status: 'in_progress' })

      try {
        const { credentials, exchange } = await registerClient(
          activeFlow.metadata.registration_endpoint,
          registrationRequest
        )

        // Mark as complete (clear any previous error)
        updateStep(registrationStep.id, {
          status: 'complete',
          mode: 'dynamic',
          credentials,
          httpExchange: exchange,
          completedAt: Date.now(),
          error: undefined,
        } as Partial<Step>)

        // Update flow state
        updateFlow({ credentials })

        // Add authorization step
        const authorizationStep: AuthorizationStep = {
          id: generateId(),
          type: 'authorization',
          status: 'pending',
        }
        addStep(authorizationStep)
      } catch (error) {
        const exchange = error instanceof FetchError ? error.exchange : undefined
        updateStep(registrationStep.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Registration failed',
          httpExchange: exchange,
        } as Partial<Step>)
      }
    },
    [activeFlow, updateStep, updateFlow, addStep]
  )

  // Handle Manual Credentials
  const handleManualCredentials = useCallback(
    (credentials: ClientCredentials) => {
      if (!activeFlow) return

      const registrationStep = activeFlow.steps.find((s) => s.type === 'registration')
      if (!registrationStep) return

      // Mark as complete (clear any previous error)
      updateStep(registrationStep.id, {
        status: 'complete',
        mode: 'manual',
        credentials,
        completedAt: Date.now(),
        error: undefined,
      } as Partial<Step>)

      // Update flow state
      updateFlow({ credentials })

      // Add authorization step
      const authorizationStep: AuthorizationStep = {
        id: generateId(),
        type: 'authorization',
        status: 'pending',
      }
      addStep(authorizationStep)
    },
    [activeFlow, updateStep, updateFlow, addStep]
  )

  // Reset Authorization step
  const handleResetAuthorization = useCallback(() => {
    if (!activeFlow) return
    const authIndex = activeFlow.steps.findIndex((s) => s.type === 'authorization')
    if (authIndex === -1) return

    const authStep = activeFlow.steps[authIndex]

    // Reset to pending
    updateStep(authStep.id, {
      status: 'pending',
      pkce: undefined,
      state: undefined,
      scope: undefined,
      authorizationUrl: undefined,
      completedAt: undefined,
      error: undefined,
    } as Partial<Step>)

    // Remove all steps after authorization
    truncateSteps(authIndex)

    // Clear flow state that depends on authorization
    updateFlow({
      pkce: undefined,
      tokens: undefined,
    })
  }, [activeFlow, updateStep, updateFlow, truncateSteps])

  // Handle Authorization - generate PKCE, build URL, redirect
  const handleAuthorize = useCallback(
    async (scope: string) => {
      if (!activeFlow?.metadata?.authorization_endpoint || !activeFlow?.credentials) return

      const authStep = activeFlow.steps.find((s) => s.type === 'authorization')
      if (!authStep) return

      // Mark as in progress
      updateStep(authStep.id, { status: 'in_progress' })

      try {
        // Generate PKCE
        const pkce = await generatePKCE()
        const state = generateState()
        const redirectUri = getCallbackUrl()

        // Build authorization URL
        const authorizationUrl = buildAuthorizationUrl({
          authorizationEndpoint: activeFlow.metadata.authorization_endpoint,
          clientId: activeFlow.credentials.client_id,
          redirectUri,
          scope,
          state,
          pkce,
        })

        // Save redirect state before navigating
        saveRedirectState({
          flowId: activeFlow.id,
          codeVerifier: pkce.code_verifier,
          state,
        })

        // Update step with authorization details
        updateStep(authStep.id, {
          status: 'complete',
          pkce,
          state,
          scope,
          authorizationUrl,
          completedAt: Date.now(),
          error: undefined,
        } as Partial<Step>)

        // Update flow state
        updateFlow({ pkce })

        // Add callback step (will be processed when user returns)
        const callbackStep: CallbackStep = {
          id: generateId(),
          type: 'callback',
          status: 'pending',
        }
        addStep(callbackStep)

        // Redirect to authorization server
        window.location.href = authorizationUrl
      } catch (error) {
        updateStep(authStep.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Authorization failed',
        } as Partial<Step>)
      }
    },
    [activeFlow, updateStep, updateFlow, addStep]
  )

  return {
    handleStartSubmit,
    handleDiscover,
    handleResetStart,
    handleResetDiscovery,
    handleRegister,
    handleManualCredentials,
    handleResetRegistration,
    handleAuthorize,
    handleResetAuthorization,
  }
}
