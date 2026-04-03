import { Routes, Route, NavLink } from 'react-router-dom'
import Overview from './pages/Overview'
import Payloads from './pages/Payloads'
import PayloadDetail from './pages/PayloadDetail'
import Devices from './pages/Devices'
import Logs from './pages/Logs'
import FHIR from './pages/FHIR'

export default function App() {
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Wearable Pipeline</h1>
          <p>Layer 1 — Raw Payload Archive</p>
        </div>
        <nav>
          <NavLink to="/" end>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Archive Explorer
          </NavLink>
          <NavLink to="/payloads">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Raw Payloads
          </NavLink>
          <NavLink to="/fhir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Hospital / FHIR
          </NavLink>
          <NavLink to="/devices">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            Devices
          </NavLink>
          <NavLink to="/logs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Ingestion Logs
          </NavLink>
        </nav>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/payloads" element={<Payloads />} />
          <Route path="/payloads/:id" element={<PayloadDetail />} />
          <Route path="/fhir" element={<FHIR />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </main>
    </div>
  )
}
