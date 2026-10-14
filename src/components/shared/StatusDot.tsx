interface StatusDotProps {
  status: 'ok' | 'error' | 'idle' | 'warning'
  pulse?: boolean
}

const colors = {
  ok: 'bg-success',
  error: 'bg-danger',
  idle: 'bg-default-400',
  warning: 'bg-warning',
}

export function StatusDot({ status, pulse }: StatusDotProps) {
  return (
    <span className="relative flex h-2 w-2">
      {pulse && status === 'ok' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status]}`} />
    </span>
  )
}
