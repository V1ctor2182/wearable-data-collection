import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, type PayloadRow, type CategoryRow } from '../api'
import { Loading, ErrorBox } from '../components/Loading'

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

  function setFilter(key: string, val: string) {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val)
    else p.delete(key)
    p.set('page', '1')
    setSearchParams(p)
  }

  function goPage(n: number) {
    const p = new URLSearchParams(searchParams)
    p.set('page', String(n))
    setSearchParams(p)
  }

  // Schema preview from first payload
  const schemaPayload = rows.length > 0 ? rows[0] : null
  const schema = schemaPayload ? extractSchema(schemaPayload.payload) : []

  return (
    <>
      <h1 className="section-title">Raw Payloads</h1>

      {/* Filters */}
      <div className="filters">
        <select value={device} onChange={e => { setFilter('device', e.target.value); setFilter('category', '') }}>
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
          {/* Schema preview when a specific category is selected */}
          {category && schema.length > 0 && (
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
        </>
      )}
    </>
  )
}
