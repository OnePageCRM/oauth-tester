import { useApp } from '../context/useApp'
import { useFlowActions } from '../hooks/useFlowActions'
import { FlowName } from './FlowName'
import {
  StartStep,
  DiscoveryStep,
  RegistrationStep,
  AuthorizationStep,
  CallbackStep,
  TokenStep,
  RefreshStep,
  IntrospectStep,
  RevokeStep,
} from './steps'
import type { Step } from '../types'
import './FlowView.css'

export function FlowView() {
  const { activeFlow, dispatch } = useApp()
  const {
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
  } = useFlowActions()

  if (!activeFlow) {
    return (
      <div className="flow-view-empty">
        <p>Select a flow from the sidebar or create a new one</p>
      </div>
    )
  }

  const handleRename = (newName: string) => {
    dispatch({ type: 'RENAME_FLOW', flowId: activeFlow.id, name: newName })
  }

  const handleFork = (stepIndex: number) => {
    dispatch({ type: 'FORK_FLOW', flowId: activeFlow.id, stepIndex })
  }

  // Placeholder handlers - will be implemented in later phases
  const handleIntrospect = () => {
    // TODO: Phase 7.2
  }

  const handleRevoke = () => {
    // TODO: Phase 7.3
  }

  const renderStep = (step: Step, index: number) => {
    const onFork = () => handleFork(index)

    switch (step.type) {
      case 'start':
        return (
          <StartStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onSubmit={handleStartSubmit}
            onReset={handleResetStart}
          />
        )
      case 'discovery':
        return (
          <DiscoveryStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onDiscover={handleDiscover}
            onReset={handleResetDiscovery}
          />
        )
      case 'registration':
        return (
          <RegistrationStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onRegister={handleRegister}
            onManualCredentials={handleManualCredentials}
            onReset={handleResetRegistration}
            hasRegistrationEndpoint={!!activeFlow.metadata?.registration_endpoint}
          />
        )
      case 'authorization':
        return (
          <AuthorizationStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onAuthorize={handleAuthorize}
            onReset={handleResetAuthorization}
            clientId={activeFlow.credentials?.client_id}
            supportedScopes={activeFlow.metadata?.scopes_supported}
          />
        )
      case 'callback':
        return <CallbackStep key={step.id} step={step} index={index} onFork={onFork} />
      case 'token': {
        // Get pre-fill values from flow state
        const authStep = activeFlow.steps.find((s) => s.type === 'authorization')
        const callbackStep = activeFlow.steps.find((s) => s.type === 'callback')
        return (
          <TokenStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onExchange={handleTokenExchange}
            onReset={handleResetToken}
            code={callbackStep?.status === 'complete' ? callbackStep.code : undefined}
            redirectUri={authStep?.redirectUri}
            clientId={authStep?.clientId ?? activeFlow.credentials?.client_id}
            codeVerifier={authStep?.codeVerifier}
            clientSecret={activeFlow.credentials?.client_secret}
            tokenEndpointAuthMethod={activeFlow.credentials?.token_endpoint_auth_method}
          />
        )
      }
      case 'refresh': {
        // Effective scope: latest token response scope, or authorization step scope
        const authStepForScope = activeFlow.steps.find((s) => s.type === 'authorization')
        const effectiveScope = activeFlow.tokens?.scope ?? authStepForScope?.scope
        return (
          <RefreshStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onRefresh={handleRefresh}
            onReset={handleResetRefresh}
            onRepeat={handleAddRefreshStep}
            refreshToken={activeFlow.tokens?.refresh_token}
            flowScope={effectiveScope}
            clientId={activeFlow.credentials?.client_id}
            clientSecret={activeFlow.credentials?.client_secret}
            tokenEndpointAuthMethod={activeFlow.credentials?.token_endpoint_auth_method}
          />
        )
      }
      case 'introspect':
        return (
          <IntrospectStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onIntrospect={handleIntrospect}
            hasIntrospectionEndpoint={!!activeFlow.metadata?.introspection_endpoint}
          />
        )
      case 'revoke':
        return (
          <RevokeStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onRevoke={handleRevoke}
            hasRevocationEndpoint={!!activeFlow.metadata?.revocation_endpoint}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flow-view">
      <div className="flow-view-header">
        <FlowName name={activeFlow.name} onRename={handleRename} />
      </div>
      <div className="flow-view-steps">{activeFlow.steps.map(renderStep)}</div>
    </div>
  )
}
