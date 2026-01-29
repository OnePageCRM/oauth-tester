import { useApp } from '../context/AppContext'
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

  // Placeholder handlers - will be implemented in Phase 5
  const handleStartSubmit = (_serverUrl: string) => {
    // TODO: Phase 5
  }

  const handleDiscover = () => {
    // TODO: Phase 5
  }

  const handleRegister = () => {
    // TODO: Phase 5
  }

  const handleManualCredentials = () => {
    // TODO: Phase 5
  }

  const handleAuthorize = (_scope: string) => {
    // TODO: Phase 5
  }

  const handleTokenExchange = () => {
    // TODO: Phase 5
  }

  const handleRefresh = () => {
    // TODO: Phase 5
  }

  const handleIntrospect = () => {
    // TODO: Phase 5
  }

  const handleRevoke = () => {
    // TODO: Phase 5
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
