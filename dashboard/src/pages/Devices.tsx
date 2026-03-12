import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type StatsResponse } from '../api'
import { Loading, ErrorBox } from '../components/Loading'

const DEVICE_INFO: Record<string, { method: string; description: string }> = {
  fitbit: { method: 'OAuth', description: 'Heart rate, HRV, sleep, SpO2, activity, steps, calories, temperature, body, ECG, VO2max, breathing rate' },
  oura: { method: 'OAuth', description: 'Sleep, readiness, activity, stress, resilience, cardiovascular age, HRV, SpO2, workouts, sessions' },
  whoop: { method: 'OAuth', description: 'Cycles, recovery, sleep, workouts, body measurements' },
  google_fit: { method: 'OAuth', description: 'Steps, heart rate, sleep, weight, blood pressure, blood glucose, SpO2, body temperature, nutrition, cycling, running' },
  apple_health: { method: 'File Upload', description: 'All HealthKit records and workouts from export.zip' },
  garmin: { method: 'File Upload', description: 'FIT binary files: heart rate, GPS, cadence, power, sessions, laps, HRV' },
  samsung: { method: 'File Upload', description: 'Samsung Health export ZIP with CSV data for sleep, exercise, heart rate, steps, stress' },
  health_connect: { method: 'File Upload', description: 'Android Health Connect JSON export: steps, heart rate, sleep, exercise, nutrition' },
  xiaomi: { method: 'File Upload', description: 'Mi Fitness JSON export: steps, sleep, heart rate, SpO2, stress' },
  polar_suunto: { method: 'File Upload', description: 'TCX/CSV/GPX files: training sessions, laps, GPS tracks, heart rate zones' },
  // terra: { method: 'Webhook', description: 'Aggregated data from Terra API covering multiple wearable platforms' },  // Terra disabled
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function Devices() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!stats) return null

  // Build per-device summary
  const deviceSummaries = new Map<string, { count: number; categories: Set<string>; lastIngested: string | null }>()
  for (const s of stats.device_stats) {
    const existing = deviceSummaries.get(s.device_type) || { count: 0, categories: new Set(), lastIngested: null }
    existing.count += s.count
    existing.categories.add(s.data_category)
    if (s.last_ingested && (!existing.lastIngested || s.last_ingested > existing.lastIngested)) {
      existing.lastIngested = s.last_ingested
    }
    deviceSummaries.set(s.device_type, existing)
  }

  // All 11 devices
  const allDevices = Object.keys(DEVICE_INFO)

  return (
    <>
      <h1 className="section-title">Devices</h1>

      {/* OAuth status */}
      {stats.oauth_tokens.length > 0 && (
        <div className="section">
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h2>OAuth Connections</h2></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Device</th><th>Status</th><th>Expires</th><th>Updated</th></tr>
                </thead>
                <tbody>
                  {stats.oauth_tokens.map(t => {
                    const expired = t.expires_at && new Date(t.expires_at) < new Date()
                    return (
                      <tr key={t.device_type}>
                        <td><span className="badge badge-device">{t.device_type}</span></td>
                        <td><span className={`badge ${expired ? 'badge-error' : 'badge-success'}`}>{expired ? 'Expired' : 'Active'}</span></td>
                        <td>{fmtTime(t.expires_at)}</td>
                        <td>{fmtTime(t.updated_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Device cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {allDevices.map(device => {
          const info = DEVICE_INFO[device]
          const summary = deviceSummaries.get(device)
          const hasData = summary && summary.count > 0

          return (
            <div
              key={device}
              className="card"
              style={{ cursor: hasData ? 'pointer' : 'default', opacity: hasData ? 1 : 0.6 }}
              onClick={() => hasData && navigate(`/payloads?device=${device}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{device}</h3>
                  <span className="badge badge-method">{info.method}</span>
                </div>
                {hasData && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.count.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>payloads</div>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{info.description}</p>
              {hasData && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Categories: {[...summary.categories].join(', ')}
                  <br />
                  Last ingested: {fmtTime(summary.lastIngested)}
                </div>
              )}
              {!hasData && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>No data yet</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
