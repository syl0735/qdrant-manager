import { useState } from 'react'
import { Button, Chip, Divider } from '@heroui/react'
import { ArrowRightLeft } from 'lucide-react'
import { ShardCard } from './ShardCard'
import { formatCount } from '@/api/utils'
import type { LocalShard, RemoteShard, Peer } from '@/types'
import type { ActiveTransfer } from '@/hooks/useTransfer'

interface NodeLaneProps {
  peerId: string
  peer: Peer
  isLocal: boolean
  shards: (LocalShard | RemoteShard)[]
  totalShards: number
  collName: string
  multiNode: boolean
  transfers: ActiveTransfer[]
  dragging: { shardId: number; fromPeerId: string } | null
  onDragStart: (shardId: number, fromPeerId: string) => void
  onMoveShard: (shardId: number, fromPeerId: string) => void
  onCopyShard: (shardId: number, fromPeerId: string) => void
  onDrop: (toPeerId: string) => void
  onSwitchNode: () => void
  onDeleteShard: (shardId: number, peerId: string) => void
  onCancelTransfer: (transfer: ActiveTransfer) => void
}

export function NodeLane({
  peerId, peer, isLocal, shards, totalShards, collName,
  multiNode, transfers, dragging, onDragStart, onMoveShard, onCopyShard, onDrop, onSwitchNode, onDeleteShard, onCancelTransfer,
}: NodeLaneProps) {
  const [isOver, setIsOver] = useState(false)

  const totalPoints = shards.reduce((a, s) => a + (s.points_count ?? 0), 0)
  const sortedShards = [...shards].sort((a, b) => a.shard_id - b.shard_id)

  const canDrop = dragging != null && dragging.fromPeerId !== peerId

  const handleDragOver = (e: React.DragEvent) => {
    if (!canDrop) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    if (!canDrop) return
    onDrop(peerId)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={`
        flex flex-col rounded-[26px] border min-w-[248px] flex-1 max-w-sm overflow-hidden
        transition-all duration-150 bg-default-100/88 backdrop-blur-md shadow-md shadow-default-300/25
        ${isOver ? 'ring-2 ring-warning/60 border-warning/40 bg-warning/10 shadow-warning/20' : 'border-white/80'}
      `}
    >
      {/* Lane header */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            color={isLocal ? 'warning' : 'primary'}
            variant="flat"
            className="text-[10px] h-6 border border-white/70"
          >
            {isLocal ? '本节点' : '远程'}
          </Chip>
          {peer.role && (
            <Chip
              size="sm"
              color={peer.role === 'Leader' ? 'success' : 'default'}
              variant="flat"
              className="text-[10px] h-6 border border-white/70"
            >
              {peer.role}
            </Chip>
          )}
          {!isLocal && multiNode && (
            <Button
              size="sm" variant="flat" color="default" radius="lg"
              className="ml-auto h-7 text-[10px] px-2.5 min-w-0 font-mono border border-white/80 bg-white/75"
              startContent={<ArrowRightLeft size={10} />}
              onPress={onSwitchNode}
            >
              切换
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs text-primary truncate">{peer.uri}</p>
          <p className="font-mono text-[10px] text-default-400">ID: {peerId}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-default-200/80 bg-white/92 p-3 text-center shadow-sm shadow-default-200/35">
            <p className="font-mono font-bold text-base">{shards.length}</p>
            <p className="text-[10px] text-default-400 uppercase tracking-[0.18em]">shards</p>
          </div>
          <div className="rounded-2xl border border-default-200/80 bg-white/92 p-3 text-center shadow-sm shadow-default-200/35">
            <p className="font-mono font-bold text-sm leading-tight mt-0.5">
              {totalPoints > 0 ? formatCount(totalPoints) : '—'}
            </p>
            <p className="text-[10px] text-default-400 uppercase tracking-[0.18em]">points</p>
          </div>
        </div>
      </div>

      <Divider className="opacity-60" />

      {/* Shard cards */}
      <div className="p-3 flex flex-col gap-2.5 flex-1 min-h-[60px] bg-default-200/25">
        {sortedShards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-default-300 bg-white/88 px-4 py-6 text-center">
            <p className="text-xs text-default-400">无 shard</p>
          </div>
        ) : (
          sortedShards.map(s => {
            const sourceTx = transfers.find(
              t => t.collName === collName && t.shardId === s.shard_id && t.fromPeerId === peerId
            )
            const targetTx = transfers.find(
              t => t.collName === collName && t.shardId === s.shard_id && t.toPeerId === peerId
            )
            return (
              <ShardCard
                key={s.shard_id}
                shardId={s.shard_id}
                state={s.state}
                pointsCount={s.points_count}
                totalShards={totalShards}
                collName={collName}
                fromPeerId={peerId}
                draggable={multiNode}
                transfer={sourceTx ?? targetTx}
                transferRole={sourceTx ? 'source' : targetTx ? 'target' : null}
                onDragStart={onDragStart}
                onMove={onMoveShard}
                onCopy={onCopyShard}
                onDelete={onDeleteShard}
                onCancelTransfer={onCancelTransfer}
              />
            )
          })
        )}

        {/* Drop indicator */}
        {isOver && dragging && (
          <div className="rounded-2xl border-2 border-dashed border-warning/60 h-16 flex items-center justify-center text-warning text-xs bg-white/70 shadow-sm">
            移动或复制 shard-{dragging.shardId} 到此节点
          </div>
        )}
      </div>
    </div>
  )
}
