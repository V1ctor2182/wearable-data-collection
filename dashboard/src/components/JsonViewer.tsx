import { useState } from 'react'

/** Recursive JSON viewer with collapsible sections. */
export default function JsonViewer({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null) return <span className="json-null">null</span>
  if (data === undefined) return <span className="json-null">undefined</span>
  if (typeof data === 'boolean') return <span className="json-bool">{String(data)}</span>
  if (typeof data === 'number') return <span className="json-number">{data}</span>
  if (typeof data === 'string') return <span className="json-string">"{data}"</span>

  if (Array.isArray(data)) {
    return <CollapsibleArray arr={data} depth={depth} />
  }

  if (typeof data === 'object') {
    return <CollapsibleObject obj={data as Record<string, unknown>} depth={depth} />
  }

  return <span>{String(data)}</span>
}

function CollapsibleObject({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  const keys = Object.keys(obj)
  const indent = '  '.repeat(depth + 1)
  const closeIndent = '  '.repeat(depth)

  if (keys.length === 0) return <span>{'{}'}</span>

  return (
    <span>
      <span onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {open ? '{' : `{ ... ${keys.length} keys }`}
      </span>
      {open && (
        <>
          {'\n'}
          {keys.map((k, i) => (
            <span key={k}>
              {indent}<span className="json-key">"{k}"</span>: <JsonViewer data={obj[k]} depth={depth + 1} />
              {i < keys.length - 1 ? ',' : ''}{'\n'}
            </span>
          ))}
          {closeIndent}{'}'}
        </>
      )}
    </span>
  )
}

function CollapsibleArray({ arr, depth }: { arr: unknown[]; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  const indent = '  '.repeat(depth + 1)
  const closeIndent = '  '.repeat(depth)

  if (arr.length === 0) return <span>{'[]'}</span>

  return (
    <span>
      <span onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {open ? '[' : `[ ... ${arr.length} items ]`}
      </span>
      {open && (
        <>
          {'\n'}
          {arr.map((item, i) => (
            <span key={i}>
              {indent}<JsonViewer data={item} depth={depth + 1} />
              {i < arr.length - 1 ? ',' : ''}{'\n'}
            </span>
          ))}
          {closeIndent}{']'}
        </>
      )}
    </span>
  )
}
