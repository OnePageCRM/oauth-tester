import { useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar'
import { FlowView } from './components/FlowView'
import { useCallbackHandler } from './hooks/useCallbackHandler'

// Request persistent storage to prevent browser from clearing data
async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) {
    console.log('Storage Persistence API not supported')
    return
  }

  const isPersisted = await navigator.storage.persisted()
  if (isPersisted) {
    console.log('Storage is already persistent')
    return
  }

  const granted = await navigator.storage.persist()
  if (granted) {
    console.log('Persistent storage granted - your flows are safe')
  } else {
    console.log('Persistent storage denied - flows may be cleared by browser')
  }
}

function AppContent() {
  // Process OAuth callback on mount
  useCallbackHandler()

  // Request persistent storage on mount
  useEffect(() => {
    requestPersistentStorage()
  }, [])

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
