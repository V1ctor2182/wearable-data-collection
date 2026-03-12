import { useEffect, useState } from 'react'
import { api, type StatsResponse } from '../api'
import { Loading, ErrorBox } from '../components/Loading'

function fmtTime(iso: string | null | unknown) {
  if (!iso || typeof iso !== 'string') return '—'
  return new Date(iso).toLocaleString()
}

export default function Logs() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!stats) return null

  return (
    <>
      <h1 className="section-title">Ingestion Logs</h1>

      {/* Ingestion logs */}
      <div className="section">
        <div className="card">
          <div className="card-header"><h2>Recent Jobs (last 20)</h2></div>
          {stats.recent_logs.length === 0 ? (
            <div className="empty-state"><h3>No ingestion logs yet</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Job Type</th>
                    <th>Status</th>
                    <th>New Records</th>
                    <th>Duplicates</th>
                    <th>Error</th>
                    <th>Started</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_logs.map((log, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-device">{String(log.device_type)}</span></td>
                      <td><span className="badge badge-method">{String(log.job_type)}</span></td>
                      <td>
                        <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                          {String(log.status)}
                        </span>
                      </td>
                      <td>{String(log.records_new ?? 0)}</td>
                      <td>{String(log.records_duplicate ?? 0)}</td>
                      <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11 }}>
                        {log.error_message ? <span style={{ color: 'var(--red)' }}>{String(log.error_message)}</span> : '—'}
                      </td>
                      <td>{fmtTime(log.started_at)}</td>
                      <td>{fmtTime(log.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* File uploads */}
      <div className="section">
        <div className="card">
          <div className="card-header"><h2>Recent File Uploads (last 20)</h2></div>
          {stats.recent_uploads.length === 0 ? (
            <div className="empty-state"><h3>No file uploads yet</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Inserted</th>
                    <th>Duplicated</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_uploads.map((u, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-device">{String(u.device_type)}</span></td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{String(u.file_name ?? '—')}</td>
                      <td>
                        <span className={`badge ${u.status === 'done' ? 'badge-success' : u.status === 'error' ? 'badge-error' : 'badge-method'}`}>
                          {String(u.status)}
                        </span>
                      </td>
                      <td>{String(u.records_inserted ?? 0)}</td>
                      <td>{String(u.records_duplicated ?? 0)}</td>
                      <td>{u.file_size_bytes ? `${(Number(u.file_size_bytes) / 1024).toFixed(1)} KB` : '—'}</td>
                      <td>{fmtTime(u.uploaded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
