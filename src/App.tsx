import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Kosten from './pages/Kosten'
import Planning from './pages/Planning'
import Werkgroep from './pages/Werkgroep'
import Gastjes from './pages/Gastjes'
import Formulas from './pages/Formulas'
import Prioriteiten from './pages/Prioriteiten'
import Verblijfzoeker from './pages/Verblijfzoeker'
import { VersionProvider } from './context/VersionContext'
import VersionSelector from './components/VersionSelector'

function App() {
  return (
    <VersionProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1 flex">
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/kosten" element={<Kosten />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/gastjes" element={<Gastjes />} />
                <Route path="/werkgroep" element={<Werkgroep />} />
                <Route path="/formules" element={<Formulas />} />
                <Route path="/prioriteiten" element={<Prioriteiten />} />
                <Route path="/verblijfzoeker" element={<Verblijfzoeker />} />
              </Routes>
            </Layout>
          </div>
          <VersionSelector />
        </div>
      </BrowserRouter>
    </VersionProvider>
  )
}

export default App
