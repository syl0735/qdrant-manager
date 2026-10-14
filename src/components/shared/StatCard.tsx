import { Card, CardBody } from '@heroui/react'

interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: string
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const colorMap = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function StatCard({ label, value, sub, color = 'default' }: StatCardProps) {
  return (
    <Card shadow="none" className="surface-card rounded-3xl">
      <CardBody className="p-4 gap-2">
        <p className="text-[11px] text-default-400 uppercase tracking-[0.2em] font-medium">{label}</p>
        <p className={`font-mono text-[1.65rem] leading-none font-bold ${colorMap[color]}`}>{value}</p>
        {sub && <p className="text-xs text-default-400 font-mono">{sub}</p>}
      </CardBody>
    </Card>
  )
}
