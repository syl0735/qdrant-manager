import { useState, useCallback } from 'react'
import {
  Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ScrollShadow, Select, SelectItem,
} from '@heroui/react'
import { NodeLane } from './NodeLane'
import { MoveConfirmModal } from './MoveConfirmModal'
import { useStore } from '@/store'
import { abortShardTransfer, deleteShard, moveShard, replicateShard } from '@/api/client'
import type { ShardTransferMethod } from '@/api/client'
import { requestNotificationPermission } from '@/api/browserNotification'
import { clearShardColorCache } from '@/api/shardColor'
import { addToast } from '@heroui/react'
import type { CollectionClusterInfo } from '@/types'
import type { ActiveTransfer } from '@/hooks/useTransfer'

type TransferOperation = 'move' | 'copy'

interface ShardBoardProps {
  collName: string
  clusterInfo: CollectionClusterInfo
  transfers: ActiveTransfer[]
  onTransferStart: (shardId: number, fromPeerId: string) => void
  onRefresh: () => Promise<void>
}

interface PendingMove {
  shardId: number
  fromPeerId: string
  toPeerId: string
}

interface PendingTarget {
  shardId: number
  fromPeerId: string
  toPeerId: string
  operation: TransferOperation
}

export function ShardBoard({
  collName, clusterInfo, transfers, onTransferStart, onRefresh,
}: ShardBoardProps) {
  const { cluster, switchNode, loadCollections } = useStore()
  const peers = cluster?.peers ?? {}
  const localPeerId = String(clusterInfo.peer_id ?? cluster?.peer_id ?? '')

  const [dragging, setDragging] = useState<{ shardId: number; fromPeerId: string } | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null)
  const [operation, setOperation] = useState<TransferOperation>('move')
  const [transferMethod, setTransferMethod] = useState<ShardTransferMethod>('stream_records')
  const [confirming, setConfirming] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ shardId: number; peerId: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Build per-node shard map
  const nodeShards: Record<string, Array<{ shard_id: number; state: string; points_count?: number }>> = {}
  Object.keys(peers).forEach(id => { nodeShards[id] = [] })
  if (localPeerId && !nodeShards[localPeerId]) nodeShards[localPeerId] = []

  clusterInfo.local_shards.forEach(s => {
    if (!nodeShards[localPeerId]) nodeShards[localPeerId] = []
    nodeShards[localPeerId].push(s)
  })
  clusterInfo.remote_shards.forEach(s => {
    const pid = String(s.peer_id)
    if (!nodeShards[pid]) nodeShards[pid] = []
    nodeShards[pid].push(s)
  })

  const allShardIds = new Set([
    ...clusterInfo.local_shards.map(s => s.shard_id),
    ...clusterInfo.remote_shards.map(s => s.shard_id),
  ])
  const totalShards = allShardIds.size || 1
  clearShardColorCache()

  const sortedPeerIds = Object.keys(nodeShards)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const multiNode = sortedPeerIds.length > 1

  const handleDragStart = useCallback((shardId: number, fromPeerId: string) => {
    setDragging({ shardId, fromPeerId })
  }, [])

  const handleDrop = useCallback((toPeerId: string) => {
    if (!dragging || dragging.fromPeerId === toPeerId) { setDragging(null); return }
    setOperation('move')
    setPendingMove({ shardId: dragging.shardId, fromPeerId: dragging.fromPeerId, toPeerId })
    setDragging(null)
  }, [dragging])

  const handleConfirmMove = async () => {
    if (!pendingMove) return
    setConfirming(true)
    try {
      await requestNotificationPermission()
      if (operation === 'copy') {
        await replicateShard(collName, pendingMove.shardId, pendingMove.fromPeerId, pendingMove.toPeerId, transferMethod)
      } else {
        await moveShard(collName, pendingMove.shardId, pendingMove.fromPeerId, pendingMove.toPeerId, transferMethod)
      }
      addToast({
        title: `Shard ${pendingMove.shardId} ${operation === 'copy' ? '复制' : '迁移'}已提交`,
        color: 'success',
      })
      onTransferStart(pendingMove.shardId, pendingMove.fromPeerId)
      setPendingMove(null)
      await loadCollections()
    } catch (e) {
      addToast({ title: '迁移失败', description: (e as Error).message, color: 'danger' })
    } finally {
      setConfirming(false)
    }
  }

  const handleDeleteShard = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteShard(collName, pendingDelete.shardId, pendingDelete.peerId)
      addToast({ title: `Shard ${pendingDelete.shardId} 删除已提交`, color: 'success' })
      setPendingDelete(null)
      await onRefresh()
    } catch (e) {
      addToast({ title: '删除 shard 失败', description: (e as Error).message, color: 'danger' })
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelTransfer = async (transfer: ActiveTransfer) => {
    try {
      await abortShardTransfer(collName, transfer.shardId, transfer.fromPeerId, transfer.toPeerId)
      addToast({ title: `Shard ${transfer.shardId} 传输已取消`, color: 'success' })
      await onRefresh()
    } catch (e) {
      addToast({ title: '取消传输失败', description: (e as Error).message, color: 'danger' })
    }
  }

  return (
    <>
      <ScrollShadow orientation="horizontal" className="w-full">
        <div className="flex gap-5 pb-2" style={{ minWidth: 'max-content' }}>
          {sortedPeerIds.map(peerId => (
            <NodeLane
              key={peerId}
              peerId={peerId}
              peer={peers[peerId] ?? { uri: peerId }}
              isLocal={peerId === localPeerId}
              shards={nodeShards[peerId] ?? []}
              totalShards={totalShards}
              collName={collName}
              multiNode={multiNode}
              transfers={transfers}
              dragging={dragging}
              onDragStart={handleDragStart}
              onMoveShard={(shardId, fromPeerId) => setPendingTarget({ shardId, fromPeerId, toPeerId: '', operation: 'move' })}
              onCopyShard={(shardId, fromPeerId) => setPendingTarget({ shardId, fromPeerId, toPeerId: '', operation: 'copy' })}
              onDrop={handleDrop}
              onSwitchNode={() => switchNode(peers[peerId]?.uri ?? '')}
              onDeleteShard={(shardId, sourcePeerId) => setPendingDelete({ shardId, peerId: sourcePeerId })}
              onCancelTransfer={handleCancelTransfer}
            />
          ))}
        </div>
      </ScrollShadow>

      {pendingMove && (
        <MoveConfirmModal
          isOpen={!!pendingMove}
          onClose={() => setPendingMove(null)}
          onConfirm={handleConfirmMove}
          operation={operation}
          onOperationChange={setOperation}
          transferMethod={transferMethod}
          onTransferMethodChange={setTransferMethod}
          shardId={pendingMove.shardId}
          totalShards={totalShards}
          fromPeerId={pendingMove.fromPeerId}
          fromUri={peers[pendingMove.fromPeerId]?.uri ?? pendingMove.fromPeerId}
          toPeerId={pendingMove.toPeerId}
          toUri={peers[pendingMove.toPeerId]?.uri ?? pendingMove.toPeerId}
          collName={collName}
          isLoading={confirming}
        />
      )}

      <Modal isOpen={!!pendingTarget} onClose={() => setPendingTarget(null)} size="sm">
        <ModalContent className="border border-white/70 bg-white/95">
          <ModalHeader className="flex flex-col gap-1">
            <span>{pendingTarget?.operation === 'copy' ? '复制' : '移动'} shard-{pendingTarget?.shardId}</span>
            <span className="text-xs font-normal text-default-400">选择目标节点</span>
          </ModalHeader>
          <ModalBody>
            <Select
              label="目标节点"
              placeholder="请选择节点"
              selectedKeys={pendingTarget?.toPeerId ? [pendingTarget.toPeerId] : []}
              onSelectionChange={keys => {
                const toPeerId = String([...keys][0] ?? '')
                setPendingTarget(target => target && { ...target, toPeerId })
              }}
            >
              {sortedPeerIds
                .filter(peerId => peerId !== pendingTarget?.fromPeerId)
                .map(peerId => (
                  <SelectItem key={peerId} textValue={peers[peerId]?.uri ?? peerId}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs">{peers[peerId]?.uri ?? peerId}</span>
                      <span className="font-mono text-[10px] text-default-400">ID: {peerId}</span>
                    </div>
                  </SelectItem>
                ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setPendingTarget(null)}>取消</Button>
            <Button
              color="primary"
              isDisabled={!pendingTarget?.toPeerId}
              onPress={() => {
                if (!pendingTarget?.toPeerId) return
                setOperation(pendingTarget.operation)
                setPendingMove({
                  shardId: pendingTarget.shardId,
                  fromPeerId: pendingTarget.fromPeerId,
                  toPeerId: pendingTarget.toPeerId,
                })
                setPendingTarget(null)
              }}
            >
              下一步
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={!!pendingDelete} onClose={() => !deleting && setPendingDelete(null)} size="sm">
        <ModalContent className="border border-danger/15 bg-white/95">
          <ModalHeader>确认删除 Shard</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              确定要从节点 <span className="font-mono">{pendingDelete?.peerId}</span> 删除 shard-{pendingDelete?.shardId} 吗？此操作不可撤销。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setPendingDelete(null)} isDisabled={deleting}>取消</Button>
            <Button color="danger" onPress={handleDeleteShard} isLoading={deleting}>确认删除</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
