import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type StatsResponse, type CategoryRow } from '../api'
import { Loading, ErrorBox } from '../components/Loading'

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

const DEVICE_LABELS: Record<string, { label: string; method: 'OAuth' | 'File Upload' }> = {
  fitbit: { label: 'Fitbit', method: 'OAuth' },
  oura: { label: 'Oura Ring', method: 'OAuth' },
  google_fit: { label: 'Google Fit', method: 'OAuth' },
  whoop: { label: 'WHOOP', method: 'OAuth' },
  apple_health: { label: 'Apple Health', method: 'File Upload' },
  garmin: { label: 'Garmin', method: 'File Upload' },
  samsung: { label: 'Samsung Health', method: 'File Upload' },
  health_connect: { label: 'Health Connect', method: 'File Upload' },
  xiaomi: { label: 'Xiaomi / Mi Fitness', method: 'File Upload' },
  polar_suunto: { label: 'Polar / Suunto', method: 'File Upload' },
}

interface DeviceGroup {
  device_type: string
  label: string
  method: string
  totalPayloads: number
  categories: { name: string; count: number; first: string | null; last: string | null }[]
  lastIngested: string | null
}

export default function Overview() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.stats(), api.categories()])
      .then(([s, c]) => { setStats(s); setCategories(c) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!stats) return null

  // Build device groups from stats
  const groupMap = new Map<string, DeviceGroup>()
  for (const s of stats.device_stats) {
    if (!groupMap.has(s.device_type)) {
      const info = DEVICE_LABELS[s.device_type] || { label: s.device_type, method: '?' }
      groupMap.set(s.device_type, {
        device_type: s.device_type,
        label: info.label,
        method: info.method,
        totalPayloads: 0,
        categories: [],
        lastIngested: null,
      })
    }
    const g = groupMap.get(s.device_type)!
    g.totalPayloads += s.count
    g.categories.push({ name: s.data_category, count: s.count, first: s.first_ingested, last: s.last_ingested })
    if (s.last_ingested && (!g.lastIngested || s.last_ingested > g.lastIngested)) {
      g.lastIngested = s.last_ingested
    }
  }
  // Sort categories within each device
  for (const g of groupMap.values()) {
    g.categories.sort((a, b) => a.name.localeCompare(b.name))
  }
  const deviceGroups = Array.from(groupMap.values()).sort((a, b) => b.totalPayloads - a.totalPayloads)

  const totalPayloads = stats.total_payloads
  const totalDevices = deviceGroups.length
  const totalCategories = categories.length

  function toggleDevice(device: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(device)) next.delete(device)
      else next.add(device)
      return next
    })
  }

  return (
    <>
      {/* Header */}
      <div className="archive-header">
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>Layer 1: Raw Payload Archive</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, maxWidth: 600 }}>
            Complete API responses and parsed file data stored as JSONB.
            SHA-256 content hash deduplication. Never lose data — supports retrospective re-extraction.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="archive-stats">
        <div className="archive-stat">
          <span className="archive-stat-value">{totalPayloads.toLocaleString()}</span>
          <span className="archive-stat-label">Total Payloads</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat">
          <span className="archive-stat-value">{totalDevices}</span>
          <span className="archive-stat-label">Devices</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat">
          <span className="archive-stat-value">{totalCategories}</span>
          <span className="archive-stat-label">Data Categories</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat">
          <span className="archive-stat-value">{stats.oauth_tokens.filter(t => t.expires_at && new Date(t.expires_at) > new Date()).length}/{stats.oauth_tokens.length}</span>
          <span className="archive-stat-label">OAuth Active</span>
        </div>
      </div>

      {/* Device tree */}
      <div className="archive-tree">
        {deviceGroups.map(group => {
          const isExpanded = expanded.has(group.device_type)
          return (
            <div key={group.device_type} className={`archive-device ${isExpanded ? 'archive-device--open' : ''}`}>
              {/* Device header */}
              <div className="archive-device-header" onClick={() => toggleDevice(group.device_type)}>
                <div className="archive-device-left">
                  <svg className={`archive-chevron ${isExpanded ? 'archive-chevron--open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span className="archive-device-name">{group.label}</span>
                  <span className={`badge ${group.method === 'OAuth' ? 'badge-method' : 'badge-category'}`}>{group.method}</span>
                </div>
                <div className="archive-device-right">
                  <span className="archive-device-count">{group.totalPayloads.toLocaleString()} payloads</span>
                  <span className="archive-device-cats">{group.categories.length} categories</span>
                </div>
              </div>

              {/* Category list */}
              {isExpanded && (
                <div className="archive-categories">
                  <div className="archive-cat-header">
                    <span style={{ flex: 1 }}>Category</span>
                    <span style={{ width: 80, textAlign: 'right' }}>Payloads</span>
                    <span style={{ width: 160, textAlign: 'right' }}>Last Ingested</span>
                    <span style={{ width: 60 }} />
                  </div>
                  {group.categories.map(cat => (
                    <div
                      key={cat.name}
                      className="archive-cat-row"
                      onClick={() => navigate(`/payloads?device=${group.device_type}&category=${cat.name}`)}
                    >
                      <span className="archive-cat-name" style={{ flex: 1 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, opacity: 0.4 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {cat.name}
                      </span>
                      <span style={{ width: 80, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>{cat.count}</span>
                      <span style={{ width: 160, textAlign: 'right', fontSize: 11, color: 'var(--text-dim)' }}>{fmtTime(cat.last)}</span>
                      <span style={{ width: 60, textAlign: 'right' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {totalPayloads === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <h3>No data in archive</h3>
          <p>Connect a device via OAuth or upload a file to start collecting raw payloads.</p>
        </div>
      )}
    </>
  )
}
