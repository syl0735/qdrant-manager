import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Progress } from '@heroui/react'
import { Copy, Ellipsis, GripVertical, MoveRight, Trash2, X } from 'lucide-react'
import { getShardColor } from '@/api/shardColor'
import { formatCount, formatEta } from '@/api/utils'
import type { ActiveTransfer } from '@/hooks/useTransfer'

interface ShardCardProps {
  shardId: number
  state: string
  pointsCount?: number
  totalShards: number
  collName: string
  fromPeerId: string
  draggable: boolean
  transfer?: ActiveTransfer
  transferRole?: 'source' | 'target' | null
  onDragStart: (shardId: number, fromPeerId: string) => void
  onMove: (shardId: number, fromPeerId: string) => void
  onCopy: (shardId: number, fromPeerId: string) => void
  onDelete: (shardId: number, peerId: string) => void
  onCancelTransfer: (transfer: ActiveTransfer) => void
}

export function ShardCard({
  shardId, state, pointsCount, totalShards, collName,
  fromPeerId, draggable, transfer, transferRole, onDragStart, onMove, onCopy, onDelete, onCancelTransfer,
}: ShardCardProps) {
  const color = getShardColor(shardId, totalShards)
  const isTransferring = !!transfer
  const isSourceTransfer = transferRole === 'source'
  const isTargetTransfer = transferRole === 'target'
  const progress = transfer?.progress

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable || isTransferring) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(shardId))
    onDragStart(shardId, fromPeerId)
  }

  const stateColor = state === 'Active' ? 'success'
    : state === 'Dead' ? 'danger'
    : 'warning'

  return (
    <div
      draggable={draggable && !isTransferring}
      onDragStart={handleDragStart}
      className={`
        rounded-[22px] border p-3.5 flex flex-col gap-2.5 select-none
        transition-all duration-150 bg-white/90 shadow-sm shadow-default-100/70
        ${draggable && !isTransferring ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}
        ${isTransferring ? 'opacity-95' : ''}
      `}
      style={{
        borderColor: isTransferring
          ? (isSourceTransfer ? 'rgba(239, 68, 68, 0.24)' : 'rgba(6, 182, 212, 0.24)')
          : color.border,
        borderLeftWidth: 4,
        background: isTransferring
          ? (isSourceTransfer
            ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(254,242,242,0.96))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(236,254,255,0.96))')
          : undefined,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-sm tracking-tight" style={{ color: color.text }}>
          shard-{shardId}
        </span>
        {isTransferring && (
          <span
            className={`
              w-2.5 h-2.5 rounded-full transfer-pulse shrink-0 ring-2 ring-offset-2 ring-offset-white
              ${isSourceTransfer ? 'bg-danger ring-danger/35' : 'bg-cyan-500 ring-cyan-500/35'}
            `}
            aria-label={isSourceTransfer ? 'moving shard source' : 'moving shard target'}
            title={isSourceTransfer ? '迁移源节点' : isTargetTransfer ? '迁移目标节点' : '传输中'}
          />
        )}
        <Chip size="sm" color={stateColor} variant="flat" className="h-5 text-[10px] px-1.5 ml-auto border border-white/70">
          {state}
        </Chip>
        {draggable && !isTransferring && (
          <GripVertical size={12} className="text-default-300 shrink-0" />
        )}
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="min-w-6 w-6 h-6 text-default-400"
              aria-label={`Shard ${shardId} 操作`}
            >
              <Ellipsis size={16} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={`Shard ${shardId} 操作`}>
            <DropdownItem
              key="move"
              isDisabled={!draggable || isTransferring}
              startContent={<MoveRight size={14} />}
              onPress={() => onMove(shardId, fromPeerId)}
            >
              移动
            </DropdownItem>
            <DropdownItem
              key="copy"
              isDisabled={!draggable || isTransferring}
              startContent={<Copy size={14} />}
              onPress={() => onCopy(shardId, fromPeerId)}
            >
              复制
            </DropdownItem>
            <DropdownItem
              key="delete"
              color="danger"
              className="text-danger"
              startContent={<Trash2 size={14} />}
              onPress={() => onDelete(shardId, fromPeerId)}
            >
              删除 shard
            </DropdownItem>
            <DropdownItem
              key="cancel-copy"
              isDisabled={!transfer || !transfer.toPeerId}
              startContent={<X size={14} />}
              onPress={() => transfer && onCancelTransfer(transfer)}
            >
              取消复制
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* Points count */}
      {pointsCount != null && (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="uppercase tracking-[0.16em] text-default-400">points</span>
          <p className="font-mono text-xs text-default-500">
          {formatCount(pointsCount)} pts
          </p>
        </div>
      )}

      {/* Transfer progress */}
      {isSourceTransfer && progress && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-warning/8 border border-warning/15 p-2.5">
          <Progress
            size="sm"
            value={progress.pct ?? undefined}
            isIndeterminate={progress.pct == null}
            color="warning"
            className="w-full"
            classNames={{ track: 'bg-warning/10' }}
            aria-label="transfer progress"
          />
          <div className="flex items-center gap-1 text-[10px] font-mono text-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-warning transfer-pulse shrink-0" />
            {progress.pct != null ? (
              <span>
                {formatCount(progress.current!)} / {formatCount(progress.total!)} · <b>{progress.pct}%</b>
                {progress.eta != null && <span className="text-default-400"> · ETA {formatEta(progress.eta)}</span>}
              </span>
            ) : (
              <span>{progress.comment}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
