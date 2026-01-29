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
  const handleAuthorize = (_scope: string) => {
    // TODO: Phase 5.3
  }

  const handleTokenExchange = () => {
    // TODO: Phase 5.5
  }

  const handleRefresh = () => {
    // TODO: Phase 5.6
  }

  const handleIntrospect = () => {
    // TODO: Phase 5.7
  }

  const handleRevoke = () => {
    // TODO: Phase 5.8
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
            supportedScopes={activeFlow.metadata?.scopes_supported}
          />
        )
      case 'callback':
        return <CallbackStep key={step.id} step={step} index={index} onFork={onFork} />
      case 'token':
        return (
          <TokenStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onExchange={handleTokenExchange}
          />
        )
      case 'refresh':
        return (
          <RefreshStep
            key={step.id}
            step={step}
            index={index}
            onFork={onFork}
            onRefresh={handleRefresh}
            hasRefreshToken={!!activeFlow.tokens?.refresh_token}
          />
        )
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
