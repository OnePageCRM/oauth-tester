import { AppProvider } from './context/AppContext'
import { Layout } from './components/Layout'
import { Sidebar } from './components/Sidebar'
import { FlowView } from './components/FlowView'

function App() {
  return (
    <AppProvider>
      <Layout sidebar={<Sidebar />}>
        <FlowView />
      </Layout>
    </AppProvider>
  )
}

export default App
