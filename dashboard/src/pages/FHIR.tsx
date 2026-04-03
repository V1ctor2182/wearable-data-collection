import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type FhirHospital, type FhirConnection, type FhirSyncResult, type PayloadRow } from '../api'
import { Loading, ErrorBox } from '../components/Loading'
import JsonViewer from '../components/JsonViewer'

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function FHIR() {
  const [hospitals, setHospitals] = useState<FhirHospital[]>([])
  const [connections, setConnections] = useState<FhirConnection[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<FhirSyncResult | null>(null)
  const [payloads, setPayloads] = useState<PayloadRow[]>([])
  const [expandedPayload, setExpandedPayload] = useState<number | null>(null)
  const [payloadsLoading, setPayloadsLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.fhirHospitals(), api.fhirConnections()])
      .then(([h, c]) => { setHospitals(h); setConnections(c) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const connectedIds = new Set(connections.filter(c => c.status === 'active').map(c => c.endpoint_id))

  async function handleConnect(endpointId: string) {
    try {
      const { authorization_url } = await api.fhirAuthorize(endpointId)
      window.open(authorization_url, '_blank')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleSync(endpointId: string) {
    setSyncing(endpointId)
    setSyncResult(null)
    setPayloads([])
    try {
      const result = await api.fhirSync(endpointId)
      setSyncResult(result)
      // Load the pulled payloads
      setPayloadsLoading(true)
      const data = await api.payloads({ deviceType: `fhir:${endpointId}`, limit: 200 })
      setPayloads(data.data)
      // Refresh connections
      const c = await api.fhirConnections()
      setConnections(c)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(null)
      setPayloadsLoading(false)
    }
  }

  async function loadPayloads(endpointId: string) {
    setPayloadsLoading(true)
    setPayloads([])
    setSyncResult(null)
    try {
      const data = await api.payloads({ deviceType: `fhir:${endpointId}`, limit: 200 })
      setPayloads(data.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPayloadsLoading(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />

  const filtered = search
    ? hospitals.filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
    : hospitals

  return (
    <>
      <h1 className="section-title">FHIR / Hospital Data</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
        Connect to your hospital's EHR via SMART on FHIR to pull your clinical data.
      </p>

      {/* Connected Hospitals */}
      {connections.length > 0 && (
        <div className="section" style={{ marginBottom: 32 }}>
          <div className="card">
            <div className="card-header"><h2>Connected Hospitals</h2></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>Patient ID</th>
                    <th>Status</th>
                    <th>Last Sync</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map(c => (
                    <tr key={c.endpoint_id}>
                      <td><strong>{c.display_name}</strong></td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.fhir_patient_id || '—'}</td>
                      <td>
                        <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtTime(c.last_sync_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-primary"
                            disabled={syncing === c.endpoint_id}
                            onClick={() => handleSync(c.endpoint_id)}
                          >
                            {syncing === c.endpoint_id ? 'Syncing...' : 'Sync Data'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => loadPayloads(c.endpoint_id)}
                          >
                            View Data
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid var(--accent)' }}>
          <div className="card-header"><h2>Sync Complete</h2></div>
          <div style={{ display: 'flex', gap: 32, padding: '0 0 8px' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{syncResult.total}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Total Resources</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{syncResult.inserted}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>New</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-dim)' }}>{syncResult.duplicated}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Duplicates</div>
            </div>
            {syncResult.errors > 0 && (
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--red)' }}>{syncResult.errors}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Errors</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Payloads Viewer */}
      {payloadsLoading && <Loading />}
      {payloads.length > 0 && (
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-header">
            <h2>Raw FHIR Payloads ({payloads.length})</h2>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {payloads.map(p => (
              <div key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', cursor: 'pointer',
                    background: expandedPayload === p.id ? 'var(--bg-hover)' : 'transparent',
                  }}
                  onClick={() => setExpandedPayload(expandedPayload === p.id ? null : p.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ transform: expandedPayload === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    <span className="badge badge-category">{p.data_category}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.api_endpoint}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtTime(p.ingested_at)}</span>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={e => { e.stopPropagation(); navigate(`/payloads/${p.id}`) }}
                    >
                      Full View
                    </button>
                  </div>
                </div>
                {expandedPayload === p.id && (
                  <div style={{ padding: '0 12px 12px', maxHeight: 400, overflowY: 'auto' }}>
                    <JsonViewer data={p.payload} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hospital Directory */}
      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2>Hospital Directory</h2>
          </div>
          <div style={{ padding: '0 0 12px' }}>
            <input
              type="text"
              placeholder="Search hospitals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                borderRadius: 6, background: 'var(--bg)', color: 'var(--text)',
                fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map(h => {
              const connected = connectedIds.has(h.id)
              return (
                <div
                  key={h.id}
                  className="card"
                  style={{
                    border: connected ? '1px solid var(--green)' : '1px solid var(--border)',
                    background: connected ? 'var(--bg-hover)' : 'var(--bg)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{h.name}</h3>
                      <span className="badge badge-method" style={{ fontSize: 10 }}>{h.vendor}</span>
                    </div>
                    {connected ? (
                      <span className="badge badge-success">Connected</span>
                    ) : (
                      <button className="btn btn-primary" onClick={() => handleConnect(h.id)}>
                        Connect
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, wordBreak: 'break-all' }}>
                    {h.fhir_base_url}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
