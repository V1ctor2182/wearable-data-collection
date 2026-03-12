import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, type PayloadRow, type CategoryRow } from '../api'
import { Loading, ErrorBox } from '../components/Loading'
import { FITBIT_API_REFERENCE, type CategoryRef } from '../data/fitbit-api-reference'
import { OURA_API_REFERENCE } from '../data/oura-api-reference'

const PAGE_SIZE = 50

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function truncateJson(payload: Record<string, unknown>, maxLen = 120) {
  const s = JSON.stringify(payload)
  return s.length > maxLen ? s.slice(0, maxLen) + '...' : s
}

/** Extract top-level keys and their types from a payload for schema preview */
function extractSchema(payload: Record<string, unknown>): { key: string; type: string; preview: string }[] {
  return Object.entries(payload).map(([key, val]) => {
    let type = typeof val
    let preview = ''
    if (val === null) { type = 'null'; preview = 'null' }
    else if (Array.isArray(val)) {
      type = `array[${val.length}]`
      if (val.length > 0 && typeof val[0] === 'object') {
        preview = `[{${Object.keys(val[0] as Record<string, unknown>).slice(0, 4).join(', ')}${Object.keys(val[0] as Record<string, unknown>).length > 4 ? ', ...' : ''}}]`
      } else if (val.length > 0) {
        preview = `[${String(val[0]).slice(0, 30)}${val.length > 1 ? ', ...' : ''}]`
      }
    }
    else if (typeof val === 'object') {
      const keys = Object.keys(val as Record<string, unknown>)
      type = `object{${keys.length}}`
      preview = `{${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', ...' : ''}}`
    }
    else if (typeof val === 'string') {
      preview = val.length > 50 ? `"${val.slice(0, 50)}..."` : `"${val}"`
    }
    else {
      preview = String(val)
    }
    return { key, type, preview }
  })
}

export default function Payloads() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [rows, setRows] = useState<PayloadRow[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const device = searchParams.get('device') || ''
  const category = searchParams.get('category') || ''
  const page = parseInt(searchParams.get('page') || '1')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [payloadRes, cats] = await Promise.all([
        api.payloads({
          deviceType: device || undefined,
          dataCategory: category || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        api.categories(),
      ])
      setRows(payloadRes.data)
      setTotal(payloadRes.total)
      setCategories(cats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [device, category, page])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const devices = [...new Set(categories.map(c => c.device_type))].sort()
  const filteredCategories = device
    ? [...new Set(categories.filter(c => c.device_type === device).map(c => c.data_category))].sort()
    : [...new Set(categories.map(c => c.data_category))].sort()

  function setFilter(key: string, val: string, alsoDelete?: string[]) {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      if (val) p.set(key, val)
      else p.delete(key)
      if (alsoDelete) alsoDelete.forEach(k => p.delete(k))
      p.set('page', '1')
      return p
    })
  }

  function goPage(n: number) {
    const p = new URLSearchParams(searchParams)
    p.set('page', String(n))
    setSearchParams(p)
  }

  // Schema preview from first payload
  const schemaPayload = rows.length > 0 ? rows[0] : null
  const schema = schemaPayload ? extractSchema(schemaPayload.payload) : []

  // API reference for supported devices
  const apiRefMap: Record<string, Record<string, CategoryRef>> = {
    fitbit: FITBIT_API_REFERENCE,
    oura: OURA_API_REFERENCE,
  }
  const deviceRef = device && apiRefMap[device] ? apiRefMap[device] : null
  const apiRef = deviceRef && category ? deviceRef[category] ?? null : null
  // Show newly added endpoints overview when a supported device is selected without category
  const newlyAddedEndpoints = deviceRef && !category
    ? Object.entries(deviceRef).filter(([, ref]) => ref.status === 'newly_added')
    : []

  return (
    <>
      <h1 className="section-title">Raw Payloads</h1>

      {/* Filters */}
      <div className="filters">
        <select value={device} onChange={e => {
          const p = new URLSearchParams(searchParams)
          const val = e.target.value
          if (val) p.set('device', val)
          else p.delete('device')
          p.delete('category')
          p.set('page', '1')
          setSearchParams(p)
        }}>
          <option value="">All Devices</option>
          {devices.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={category} onChange={e => setFilter('category', e.target.value)}>
          <option value="">All Categories</option>
          {filteredCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {total.toLocaleString()} payload{total !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : (
        <>
          {/* API Reference card for Fitbit categories */}
          {apiRef && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div>
                  <h2>Field Reference — {category}{' '}
                    {apiRef.status === 'newly_added' && <span className="badge badge-newly-added" style={{ fontSize: 10, verticalAlign: 'middle', marginLeft: 8 }}>NEWLY ADDED</span>}
                    {apiRef.status === 'empty' && <span className="badge" style={{ fontSize: 10, verticalAlign: 'middle', marginLeft: 8, background: 'rgba(156,163,175,.15)', color: '#9ca3af' }}>NO DATA YET</span>}
                  </h2>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginTop: 4 }}>
                    {apiRef.endpoint}
                  </div>
                </div>
                <a
                  href={apiRef.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                >
                  Official API Docs &nearr;
                </a>
              </div>
              {apiRef.status === 'newly_added' && (
                <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 12, padding: '8px 12px', background: 'rgba(245,158,11,.08)', borderRadius: 6 }}>
                  <strong>Newly added endpoint</strong> — {apiRef.notCollectedReason}
                </div>
              )}
              {apiRef.note && (
                <div style={{ fontSize: 12, color: 'var(--yellow)', marginBottom: 12, padding: '8px 12px', background: 'rgba(234,179,8,.08)', borderRadius: 6 }}>
                  {apiRef.note}
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Field Path</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiRef.fields.map(f => (
                      <tr key={f.path}>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#93c5fd' }}>{f.path}</td>
                        <td><span className="badge" style={{ background: 'rgba(139,92,246,.15)', color: '#c084fc' }}>{f.type}</span></td>
                        <td>
                          <span className={`badge ${f.source === 'payload' ? 'badge-payload' : 'badge-apidoc'}`}>
                            {f.source === 'payload' ? 'PAYLOAD' : 'API DOC'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payload Structure from actual data (non-fitbit or no API ref) */}
          {category && schema.length > 0 && !apiRef && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h2>Payload Structure — {category}</h2>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>based on first payload</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                      <th>Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schema.map(s => (
                      <tr key={s.key}>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#93c5fd' }}>{s.key}</td>
                        <td><span className="badge" style={{ background: 'rgba(139,92,246,.15)', color: '#c084fc' }}>{s.type}</span></td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.preview}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="empty-state">
              <h3>No payloads found</h3>
              <p>Try adjusting filters or ingest some data first.</p>
            </div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Device</th>
                      <th>Category</th>
                      <th>Method</th>
                      <th>Data Time</th>
                      <th>Payload Preview</th>
                      <th>Ingested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className="clickable" onClick={() => navigate(`/payloads/${r.id}`)}>
                        <td>#{r.id}</td>
                        <td><span className="badge badge-device">{r.device_type}</span></td>
                        <td><span className="badge badge-category">{r.data_category}</span></td>
                        <td><span className="badge badge-method">{r.ingestion_method}</span></td>
                        <td>{fmtTime(r.data_start_time)}</td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                          {truncateJson(r.payload)}
                        </td>
                        <td>{fmtTime(r.ingested_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>Prev</button>
                  <span>Page {page} of {totalPages}</span>
                  <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>Next</button>
                </div>
              )}
            </div>
          )}

          {/* Newly Added Endpoints - show when fitbit is selected but no category */}
          {newlyAddedEndpoints.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h2>Newly Added Endpoints</h2>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Recently added {device} API endpoints — re-sync to pull data</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>API Path</th>
                      <th>Why It Was Missing</th>
                      <th>Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newlyAddedEndpoints.map(([cat, ref]) => (
                      <tr key={cat} className="clickable" onClick={() => {
                        const p = new URLSearchParams(searchParams)
                        p.set('device', device)
                        p.set('category', cat)
                        p.set('page', '1')
                        setSearchParams(p)
                      }}>
                        <td>
                          <span className="badge badge-newly-added" style={{ fontSize: 11 }}>{cat}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{ref.endpoint}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 350 }}>{ref.notCollectedReason}</td>
                        <td>
                          <a href={ref.docsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent)', fontSize: 12 }}>
                            docs &nearr;
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
