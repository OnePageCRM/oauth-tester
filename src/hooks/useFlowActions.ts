import { useCallback } from 'react'
import { useApp } from '../context/useApp'
import { generateId } from '../services/flows'
import {
  discoverMetadata,
  registerClient,
  buildAuthorizationUrl,
  exchangeToken,
  refreshToken,
  getCallbackUrl,
  FetchError,
} from '../services/oauth'
import { generatePKCE, generateState } from '../services/pkce'
import { ProxyFetchError } from '../services/proxy'
import { saveRedirectState } from '../services/storage'
import type {
  Flow,
  Step,
  DiscoveryStep,
  RegistrationStep,
  AuthorizationStep,
  CallbackStep,
  TokenStep,
  RefreshStep,
  ClientCredentials,
  RegistrationRequest,
} from '../types'
import type { AuthorizationFormData } from '../components/steps/AuthorizationStep'
import type { TokenFormData } from '../components/steps/TokenStep'
import type { RefreshFormData } from '../components/steps/RefreshStep'

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
  const handleDiscover = useCallback(
    async (useProxy: boolean = false) => {
      if (!activeFlow?.serverUrl) return

      const discoveryStep = activeFlow.steps.find((s) => s.type === 'discovery')
      if (!discoveryStep) return

      // Mark as in progress
      updateStep(discoveryStep.id, { status: 'in_progress' })

      try {
        const { metadata, exchange } = await discoverMetadata(activeFlow.serverUrl, useProxy)

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
        const exchange =
          error instanceof FetchError || error instanceof ProxyFetchError
            ? error.exchange
            : undefined
        updateStep(discoveryStep.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Discovery failed',
          httpExchange: exchange,
        } as Partial<Step>)
      }
    },
    [activeFlow, updateStep, updateFlow, addStep]
  )

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
      tokens: undefined,
    })
  }, [activeFlow, updateStep, updateFlow, truncateSteps])

  // Handle Dynamic Registration
  const handleRegister = useCallback(
    async (registrationRequest: RegistrationRequest, useProxy: boolean = true) => {
      if (!activeFlow?.metadata?.registration_endpoint) return

      const registrationStep = activeFlow.steps.find((s) => s.type === 'registration')
      if (!registrationStep) return

      // Mark as in progress
      updateStep(registrationStep.id, { status: 'in_progress' })

      try {
        const { credentials, exchange } = await registerClient(
          activeFlow.metadata.registration_endpoint,
          registrationRequest,
          useProxy
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
        const exchange =
          error instanceof FetchError || error instanceof ProxyFetchError
            ? error.exchange
            : undefined
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

      // Mark as complete (clear any previous error and httpExchange since manual mode has no request)
      updateStep(registrationStep.id, {
        status: 'complete',
        mode: 'manual',
        credentials,
        completedAt: Date.now(),
        error: undefined,
        httpExchange: undefined,
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
      responseType: undefined,
      clientId: undefined,
      redirectUri: undefined,
      scope: undefined,
      state: undefined,
      codeChallenge: undefined,
      codeChallengeMethod: undefined,
      codeVerifier: undefined,
      authorizationUrl: undefined,
      completedAt: undefined,
      error: undefined,
    } as Partial<Step>)

    // Remove all steps after authorization
    truncateSteps(authIndex)

    // Clear flow state that depends on authorization
    updateFlow({
      tokens: undefined,
    })
  }, [activeFlow, updateStep, updateFlow, truncateSteps])

  // Handle Authorization - build URL with user-provided values, redirect
  const handleAuthorize = useCallback(
    async (formData: AuthorizationFormData) => {
      if (!activeFlow?.metadata?.authorization_endpoint) return

      const authStep = activeFlow.steps.find((s) => s.type === 'authorization')
      if (!authStep) return

      // Mark as in progress
      updateStep(authStep.id, { status: 'in_progress' })

      try {
        // Build authorization URL with user-provided values
        const authorizationUrl = buildAuthorizationUrl({
          authorizationEndpoint: activeFlow.metadata.authorization_endpoint,
          responseType: formData.responseType,
          clientId: formData.clientId,
          redirectUri: formData.redirectUri,
          scope: formData.scope,
          state: formData.state,
          codeChallenge: formData.codeChallenge,
          codeChallengeMethod: formData.codeChallengeMethod,
        })

        // Save redirect state before navigating
        saveRedirectState({
          flowId: activeFlow.id,
          codeVerifier: formData.codeVerifier,
          state: formData.state,
        })

        // Update step with authorization details
        updateStep(authStep.id, {
          status: 'complete',
          responseType: formData.responseType,
          clientId: formData.clientId,
          redirectUri: formData.redirectUri,
          scope: formData.scope,
          state: formData.state,
          codeChallenge: formData.codeChallenge,
          codeChallengeMethod: formData.codeChallengeMethod,
          codeVerifier: formData.codeVerifier,
          authorizationUrl,
          completedAt: Date.now(),
          error: undefined,
        } as Partial<Step>)

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
    [activeFlow, updateStep, addStep]
  )

  // Reset Token step
  const handleResetToken = useCallback(() => {
    if (!activeFlow) return
    const tokenIndex = activeFlow.steps.findIndex((s) => s.type === 'token')
    if (tokenIndex === -1) return

    const tokenStep = activeFlow.steps[tokenIndex]

    // Reset to pending - clear all request and response fields
    updateStep(tokenStep.id, {
      status: 'pending',
      grantType: undefined,
      code: undefined,
      redirectUri: undefined,
      codeVerifier: undefined,
      tokenEndpointAuthMethod: undefined,
      clientIdBasic: undefined,
      clientSecretBasic: undefined,
      clientIdPost: undefined,
      clientSecretPost: undefined,
      tokenEndpoint: undefined,
      tokens: undefined,
      httpExchange: undefined,
      completedAt: undefined,
      error: undefined,
    } as Partial<Step>)

    // Remove all steps after token
    truncateSteps(tokenIndex)

    // Clear tokens from flow state
    updateFlow({
      tokens: undefined,
    })
  }, [activeFlow, updateStep, updateFlow, truncateSteps])

  // Handle Token Exchange
  const handleTokenExchange = useCallback(
    async (formData: TokenFormData) => {
      if (!activeFlow?.metadata?.token_endpoint) return

      const tokenStep = activeFlow.steps.find((s) => s.type === 'token')
      if (!tokenStep) return

      const tokenEndpoint = activeFlow.metadata.token_endpoint

      // Mark as in progress
      updateStep(tokenStep.id, { status: 'in_progress' })

      try {
        const { tokens, exchange } = await exchangeToken({
          tokenEndpoint,
          code: formData.code,
          redirectUri: formData.redirectUri,
          codeVerifier: formData.codeVerifier,
          tokenEndpointAuthMethod: formData.tokenEndpointAuthMethod,
          clientIdBasic: formData.clientIdBasic || undefined,
          clientSecretBasic: formData.clientSecretBasic || undefined,
          clientIdPost: formData.clientIdPost || undefined,
          clientSecretPost: formData.clientSecretPost || undefined,
          useProxy: formData.useProxy,
        })

        // Mark as complete with request params stored
        updateStep(tokenStep.id, {
          status: 'complete',
          grantType: formData.grantType,
          code: formData.code,
          redirectUri: formData.redirectUri,
          codeVerifier: formData.codeVerifier,
          tokenEndpointAuthMethod: formData.tokenEndpointAuthMethod,
          clientIdBasic: formData.clientIdBasic || undefined,
          clientSecretBasic: formData.clientSecretBasic || undefined,
          clientIdPost: formData.clientIdPost || undefined,
          clientSecretPost: formData.clientSecretPost || undefined,
          tokenEndpoint,
          tokens,
          httpExchange: exchange,
          completedAt: Date.now(),
          error: undefined,
        } as Partial<Step>)

        // Update flow state
        updateFlow({ tokens })

        // Add refresh step if we have a refresh token
        if (tokens.refresh_token) {
          const refreshStep: RefreshStep = {
            id: generateId(),
            type: 'refresh',
            status: 'pending',
          }
          addStep(refreshStep)
        }
      } catch (error) {
        const exchange =
          error instanceof FetchError || error instanceof ProxyFetchError
            ? error.exchange
            : undefined
        updateStep(tokenStep.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Token exchange failed',
          httpExchange: exchange,
          // Still store the request params on error
          grantType: formData.grantType,
          code: formData.code,
          redirectUri: formData.redirectUri,
          codeVerifier: formData.codeVerifier,
          tokenEndpointAuthMethod: formData.tokenEndpointAuthMethod,
          clientIdBasic: formData.clientIdBasic || undefined,
          clientSecretBasic: formData.clientSecretBasic || undefined,
          clientIdPost: formData.clientIdPost || undefined,
          clientSecretPost: formData.clientSecretPost || undefined,
          tokenEndpoint,
        } as Partial<Step>)
      }
    },
    [activeFlow, updateStep, updateFlow, addStep]
  )

  // Reset Refresh step
  const handleResetRefresh = useCallback(() => {
    if (!activeFlow) return
    const refreshIndex = activeFlow.steps.findIndex((s) => s.type === 'refresh')
    if (refreshIndex === -1) return

    const refreshStep = activeFlow.steps[refreshIndex]

    // Reset to pending - clear all request and response fields
    updateStep(refreshStep.id, {
      status: 'pending',
      grantType: undefined,
      refreshToken: undefined,
      scope: undefined,
      tokenEndpointAuthMethod: undefined,
      clientIdBasic: undefined,
      clientSecretBasic: undefined,
      clientIdPost: undefined,
      clientSecretPost: undefined,
      tokenEndpoint: undefined,
      tokens: undefined,
      httpExchange: undefined,
      completedAt: undefined,
      error: undefined,
    } as Partial<Step>)

    // Remove all steps after refresh
    truncateSteps(refreshIndex)
  }, [activeFlow, updateStep, truncateSteps])

  // Handle Token Refresh
  const handleRefresh = useCallback(
    async (formData: RefreshFormData) => {
      if (!activeFlow?.metadata?.token_endpoint) return

      // Find the specific refresh step by ID (not just any refresh step)
      const refreshStepData = activeFlow.steps.find((s) => s.id === formData.stepId)
      if (!refreshStepData) return

      const tokenEndpoint = activeFlow.metadata.token_endpoint

      // Mark as in progress
      updateStep(refreshStepData.id, { status: 'in_progress' })

      try {
        const { tokens, exchange } = await refreshToken({
          tokenEndpoint,
          refreshToken: formData.refreshToken,
          scope: formData.scope || undefined,
          tokenEndpointAuthMethod: formData.tokenEndpointAuthMethod,
          clientIdBasic: formData.clientIdBasic || undefined,
          clientSecretBasic: formData.clientSecretBasic || undefined,
          clientIdPost: formData.clientIdPost || undefined,
          clientSecretPost: formData.clientSecretPost || undefined,
          useProxy: formData.useProxy,
        })

        // Mark as complete with request params stored
        updateStep(refreshStepData.id, {
          status: 'complete',
          grantType: formData.grantType,
          refreshToken: formData.refreshToken,
          scope: formData.scope || undefined,
          tokenEndpointAuthMethod: formData.tokenEndpointAuthMethod,
          clientIdBasic: formData.clientIdBasic || undefined,
          clientSecretBasic: formData.clientSecretBasic || undefined,
          clientIdPost: formData.clientIdPost || undefined,
          clientSecretPost: formData.clientSecretPost || undefined,
          tokenEndpoint,
          tokens,
          httpExchange: exchange,
          completedAt: Date.now(),
          error: undefined,
        } as Partial<Step>)

        // Update flow state with new tokens
        // Merge with existing tokens (refresh might not return all fields)
        updateFlow({
          tokens: {
            ...activeFlow.tokens,
            ...tokens,
          },
        })
      } catch (error) {
        const exchange =
          error instanceof FetchError || error instanceof ProxyFetchError
            ? error.exchange
            : undefined
        updateStep(refreshStepData.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Token refresh failed',
          httpExchange: exchange,
          // Store request params on error
          grantType: formData.grantType,
          refreshToken: formData.refreshToken,
          scope: formData.scope || undefined,
          tokenEndpointAuthMethod: formData.tokenEndpointAuthMethod,
          clientIdBasic: formData.clientIdBasic || undefined,
          clientSecretBasic: formData.clientSecretBasic || undefined,
          clientIdPost: formData.clientIdPost || undefined,
          clientSecretPost: formData.clientSecretPost || undefined,
          tokenEndpoint,
        } as Partial<Step>)
      }
    },
    [activeFlow, updateStep, updateFlow]
  )

  // Add a new refresh step
  const handleAddRefreshStep = useCallback(() => {
    if (!activeFlow) return

    const newRefreshStep: RefreshStep = {
      id: generateId(),
      type: 'refresh',
      status: 'pending',
    }
    addStep(newRefreshStep)
  }, [activeFlow, addStep])

  // --- Restart handlers: reset step + immediately re-execute with same params ---

  const handleRestartStart = useCallback(() => {
    if (!activeFlow) return
    const startStep = activeFlow.steps.find((s) => s.type === 'start')
    if (!startStep?.serverUrl) return
    const serverUrl = startStep.serverUrl
    handleResetStart()
    handleStartSubmit(serverUrl)
  }, [activeFlow, handleResetStart, handleStartSubmit])

  const handleRestartDiscovery = useCallback(() => {
    if (!activeFlow) return
    handleResetDiscovery()
    handleDiscover()
  }, [activeFlow, handleResetDiscovery, handleDiscover])

  const handleRestartRegistration = useCallback(() => {
    if (!activeFlow) return
    const regStep = activeFlow.steps.find((s) => s.type === 'registration') as
      | RegistrationStep
      | undefined
    if (!regStep) return

    if (regStep.mode === 'manual' && regStep.credentials) {
      const credentials: ClientCredentials = { ...regStep.credentials }
      handleResetRegistration()
      handleManualCredentials(credentials)
    } else if (regStep.mode === 'dynamic' && regStep.httpExchange?.request.body) {
      try {
        const request = JSON.parse(regStep.httpExchange.request.body) as RegistrationRequest
        handleResetRegistration()
        handleRegister(request)
      } catch {
        // Can't reconstruct request, just reset
        handleResetRegistration()
      }
    }
  }, [activeFlow, handleResetRegistration, handleManualCredentials, handleRegister])

  const handleRestartAuthorization = useCallback(async () => {
    if (!activeFlow) return
    const authStep = activeFlow.steps.find((s) => s.type === 'authorization') as
      | AuthorizationStep
      | undefined
    if (!authStep) return

    const pkce = await generatePKCE()
    const newState = generateState()

    handleResetAuthorization()
    handleAuthorize({
      responseType: authStep.responseType ?? 'code',
      clientId: authStep.clientId ?? activeFlow.credentials?.client_id ?? '',
      redirectUri: authStep.redirectUri ?? getCallbackUrl(),
      scope: authStep.scope ?? '',
      state: newState,
      codeChallenge: pkce.code_challenge,
      codeChallengeMethod: pkce.code_challenge_method,
      codeVerifier: pkce.code_verifier,
    })
  }, [activeFlow, handleResetAuthorization, handleAuthorize])

  const handleRestartToken = useCallback(() => {
    if (!activeFlow) return
    const tokenStep = activeFlow.steps.find((s) => s.type === 'token') as TokenStep | undefined
    if (!tokenStep) return

    const authMethod = tokenStep.tokenEndpointAuthMethod ?? 'client_secret_basic'
    const formData = {
      grantType: tokenStep.grantType ?? 'authorization_code',
      code: tokenStep.code ?? '',
      redirectUri: tokenStep.redirectUri ?? '',
      codeVerifier: tokenStep.codeVerifier ?? '',
      tokenEndpointAuthMethod: authMethod,
      clientIdBasic: tokenStep.clientIdBasic ?? '',
      clientSecretBasic: tokenStep.clientSecretBasic ?? '',
      clientIdPost: tokenStep.clientIdPost ?? '',
      clientSecretPost: tokenStep.clientSecretPost ?? '',
      useProxy: authMethod !== 'none',
    }

    handleResetToken()
    handleTokenExchange(formData)
  }, [activeFlow, handleResetToken, handleTokenExchange])

  const handleRestartRefresh = useCallback(
    (stepId: string) => {
      if (!activeFlow) return
      const refreshStepData = activeFlow.steps.find((s) => s.id === stepId) as
        | RefreshStep
        | undefined
      if (!refreshStepData) return

      const stepIndex = activeFlow.steps.findIndex((s) => s.id === stepId)
      if (stepIndex === -1) return

      const authMethod = refreshStepData.tokenEndpointAuthMethod ?? 'client_secret_basic'
      const formData: RefreshFormData = {
        stepId,
        grantType: refreshStepData.grantType ?? 'refresh_token',
        refreshToken: refreshStepData.refreshToken ?? activeFlow.tokens?.refresh_token ?? '',
        scope: refreshStepData.scope ?? '',
        tokenEndpointAuthMethod: authMethod,
        clientIdBasic: refreshStepData.clientIdBasic ?? '',
        clientSecretBasic: refreshStepData.clientSecretBasic ?? '',
        clientIdPost: refreshStepData.clientIdPost ?? '',
        clientSecretPost: refreshStepData.clientSecretPost ?? '',
        useProxy: authMethod !== 'none',
      }

      // Reset this specific refresh step by ID (not the generic reset which finds the first one)
      updateStep(stepId, {
        status: 'pending',
        grantType: undefined,
        refreshToken: undefined,
        scope: undefined,
        tokenEndpointAuthMethod: undefined,
        clientIdBasic: undefined,
        clientSecretBasic: undefined,
        clientIdPost: undefined,
        clientSecretPost: undefined,
        tokenEndpoint: undefined,
        tokens: undefined,
        httpExchange: undefined,
        completedAt: undefined,
        error: undefined,
      } as Partial<Step>)
      truncateSteps(stepIndex)

      handleRefresh(formData)
    },
    [activeFlow, updateStep, truncateSteps, handleRefresh]
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
    handleTokenExchange,
    handleResetToken,
    handleRefresh,
    handleResetRefresh,
    handleAddRefreshStep,
    handleRestartStart,
    handleRestartDiscovery,
    handleRestartRegistration,
    handleRestartAuthorization,
    handleRestartToken,
    handleRestartRefresh,
  }
}
