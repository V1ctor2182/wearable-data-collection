import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type PayloadRow } from '../api'
import JsonViewer from '../components/JsonViewer'
import { Loading, ErrorBox } from '../components/Loading'

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function PayloadDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PayloadRow | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copyText, setCopyText] = useState('Copy JSON')

  useEffect(() => {
    if (!id) return
    api.payload(Number(id))
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function handleCopy() {
    if (!data) return
    navigator.clipboard.writeText(JSON.stringify(data.payload, null, 2))
    setCopyText('Copied!')
    setTimeout(() => setCopyText('Copy JSON'), 2000)
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data) return null

  const payloadSize = JSON.stringify(data.payload).length

  return (
    <>
      <Link to="/payloads" className="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Payloads
      </Link>

      <h1 className="section-title">Payload #{data.id}</h1>

      {/* Meta info */}
      <div className="card-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">Device</div>
          <div className="value" style={{ fontSize: 20 }}>{data.device_type}</div>
        </div>
        <div className="stat-card">
          <div className="label">Category</div>
          <div className="value" style={{ fontSize: 20 }}>{data.data_category}</div>
        </div>
        <div className="stat-card">
          <div className="label">Payload Size</div>
          <div className="value" style={{ fontSize: 20 }}>{(payloadSize / 1024).toFixed(1)} KB</div>
        </div>
        <div className="stat-card">
          <div className="label">Content Hash</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginTop: 8, wordBreak: 'break-all' }}>
            {data.content_hash}
          </div>
        </div>
      </div>

      {/* Details table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h2>Metadata</h2></div>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><td style={{ color: 'var(--text-dim)', width: 180 }}>Ingestion Method</td><td>{data.ingestion_method || '—'}</td></tr>
              <tr><td style={{ color: 'var(--text-dim)' }}>API Endpoint</td><td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{data.api_endpoint || '—'}</td></tr>
              <tr><td style={{ color: 'var(--text-dim)' }}>Source File</td><td>{data.source_file_name || '—'}</td></tr>
              <tr><td style={{ color: 'var(--text-dim)' }}>Data Start</td><td>{fmtTime(data.data_start_time)}</td></tr>
              <tr><td style={{ color: 'var(--text-dim)' }}>Data End</td><td>{fmtTime(data.data_end_time)}</td></tr>
              <tr><td style={{ color: 'var(--text-dim)' }}>Ingested At</td><td>{fmtTime(data.ingested_at)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON payload */}
      <div className="card">
        <div className="card-header">
          <h2>Raw JSON Payload</h2>
          <button className="btn btn-ghost" onClick={handleCopy}>{copyText}</button>
        </div>
        <div className="json-viewer">
          <JsonViewer data={data.payload} />
        </div>
      </div>
    </>
  )
}
