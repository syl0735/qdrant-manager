import type { TransferProgress } from '@/types'

export function parseTransferComment(comment: string): TransferProgress {
  if (!comment) return { comment: '传输中…', current: null, total: null, pct: null, eta: null }
  const m = comment.match(/\((\d+)\/(\d+)\)/)
  const etaM = comment.match(/ETA:\s*([\d.]+)s/)
  const current = m ? parseInt(m[1]) : null
  const total = m ? parseInt(m[2]) : null
  const eta = etaM ? parseFloat(etaM[1]) : null
  const pct = current != null && total != null && total > 0
    ? Math.round(current / total * 100) : null
  return { comment, current, total, pct, eta }
}

export function formatEta(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds)}s`
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}
