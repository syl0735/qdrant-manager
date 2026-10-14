import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchActiveTransfers } from '@/api/client'
import { parseTransferComment } from '@/api/utils'
import type { TransferProgress } from '@/types'

export interface ActiveTransfer {
  collName: string
  shardId: number
  fromPeerId: string
  toPeerId: string
  progress: TransferProgress
}

interface UseTransferReturn {
  transfers: ActiveTransfer[]
  startPolling: (collName: string, shardId: number, fromPeerId: string) => void
  syncPolling: (collName: string) => Promise<void>
  stopPolling: (collName: string, shardId: number) => void
  isTransferring: (collName: string, shardId: number, fromPeerId: string) => boolean
}

export function useTransfer(onComplete?: (collName: string, shardId: number) => void): UseTransferReturn {
  const [transfers, setTransfers] = useState<ActiveTransfer[]>([])
  // key → intervalId
  const intervals = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  // key → collName (needed for cleanup lookup)
  const keyMeta = useRef<Record<string, { collName: string; shardId: number }>>({})

  const stopPolling = useCallback((collName: string, shardId: number) => {
    const key = `${collName}:${shardId}`
    if (intervals.current[key]) {
      clearInterval(intervals.current[key])
      delete intervals.current[key]
      delete keyMeta.current[key]
    }
    setTransfers(prev => prev.filter(t => !(t.collName === collName && t.shardId === shardId)))
  }, [])

  const startPolling = useCallback((collName: string, shardId: number, fromPeerId: string) => {
    const key = `${collName}:${shardId}`
    if (intervals.current[key]) clearInterval(intervals.current[key])
    keyMeta.current[key] = { collName, shardId }

    // Initial placeholder
    setTransfers(prev => {
      const next = prev.filter(
        t => !(t.collName === collName && t.shardId === shardId && t.fromPeerId === fromPeerId)
      )
      return [...next, {
        collName,
        shardId, fromPeerId, toPeerId: '',
        progress: { comment: '等待传输开始…', current: null, total: null, pct: null, eta: null }
      }]
    })

    const poll = async () => {
      try {
        const txList = await fetchActiveTransfers(collName)
        const activeTxs = txList.filter(t => String(t.shard_id) === String(shardId))

        if (activeTxs.length > 0) {
          setTransfers(prev => {
            const next = prev.filter(t => !(t.collName === collName && t.shardId === shardId))
            return [
              ...next,
              ...activeTxs.map(tx => ({
                collName,
                shardId,
                fromPeerId: String(tx.from),
                toPeerId: String(tx.to),
                progress: parseTransferComment(tx.comment),
              })),
            ]
          })
          return
        }

        // No active transfer — shard has moved or is in limbo
        clearInterval(intervals.current[key])
        delete intervals.current[key]
        delete keyMeta.current[key]
        setTransfers(prev => prev.filter(t => !(t.collName === collName && t.shardId === shardId)))
        onComplete?.(collName, shardId)
      } catch {
        // network hiccup — keep polling
      }
    }

    void poll()
    intervals.current[key] = setInterval(poll, 2000)
  }, [onComplete])

  const syncPolling = useCallback(async (collName: string) => {
    try {
      const txList = await fetchActiveTransfers(collName)
      const activeTransfers = txList.map(tx => ({
        collName,
        shardId: tx.shard_id,
        fromPeerId: String(tx.from),
        toPeerId: String(tx.to),
        progress: parseTransferComment(tx.comment),
      }))

      setTransfers(prev => {
        const others = prev.filter(t => t.collName !== collName || !keyMeta.current[`${collName}:${t.shardId}`])
        return [...others, ...activeTransfers]
      })

      txList.forEach(tx => {
        const key = `${collName}:${tx.shard_id}`
        if (!intervals.current[key]) {
          startPolling(collName, tx.shard_id, String(tx.from))
        }
      })
    } catch {
      // Ignore bootstrap failures and wait for next manual action/refresh
    }
  }, [startPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervals.current).forEach(clearInterval)
    }
  }, [])

  const isTransferring = useCallback((collName: string, shardId: number, fromPeerId: string) => {
    return transfers.some(
      t => t.collName === collName && t.shardId === shardId && t.fromPeerId === fromPeerId
    )
  }, [transfers])

  return { transfers, startPolling, syncPolling, stopPolling, isTransferring }
}
