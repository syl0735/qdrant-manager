import { cn } from '@heroui/react'

interface MonoTextProps {
  children: React.ReactNode
  className?: string
  dim?: boolean
}

export function MonoText({ children, className, dim }: MonoTextProps) {
  return (
    <span className={cn(
      'font-mono text-xs',
      dim ? 'text-default-400' : 'text-foreground',
      className
    )}>
      {children}
    </span>
  )
}
