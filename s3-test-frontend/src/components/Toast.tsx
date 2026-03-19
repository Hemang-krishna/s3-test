interface ToastProps {
  kind: 'success' | 'error'
  message: string
}

export default function Toast({ kind, message }: ToastProps) {
  return <div className={`toast toast-${kind}`}>{message}</div>
}
