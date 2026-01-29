import { AppProvider } from './context/AppContext'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar'
import { FlowView } from './components/FlowView'
import { useCallbackHandler } from './hooks/useCallbackHandler'

function AppContent() {
  // Process OAuth callback on mount
  useCallbackHandler()

  return (
    <Layout sidebar={<Sidebar />}>
      <FlowView />
    </Layout>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
