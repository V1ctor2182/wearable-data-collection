export function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
      Loading...
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error-box">{message}</div>
}
