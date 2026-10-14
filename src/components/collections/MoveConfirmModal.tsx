import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Chip, Select, SelectItem,
} from '@heroui/react'
import { ArrowRight, Copy, MoveRight } from 'lucide-react'
import { getShardColor } from '@/api/shardColor'
import type { ShardTransferMethod } from '@/api/client'

type TransferOperation = 'move' | 'copy'

interface MoveConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  operation: TransferOperation
  onOperationChange: (operation: TransferOperation) => void
  transferMethod: ShardTransferMethod
  onTransferMethodChange: (method: ShardTransferMethod) => void
  shardId: number
  totalShards: number
  fromPeerId: string
  fromUri: string
  toPeerId: string
  toUri: string
  collName: string
  isLoading?: boolean
}

export function MoveConfirmModal({
  isOpen, onClose, onConfirm,
  operation, onOperationChange,
  transferMethod, onTransferMethodChange,
  shardId, totalShards,
  fromPeerId, fromUri,
  toPeerId, toUri,
  collName, isLoading,
}: MoveConfirmModalProps) {
  const color = getShardColor(shardId, totalShards)
  const isCopy = operation === 'copy'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent className="border border-white/70 bg-white/90 backdrop-blur-md shadow-xl shadow-default-200/50">
        <ModalHeader className="flex flex-col gap-1 pb-3">
          <span>确认 Shard 操作</span>
          <span className="text-xs text-default-400 font-normal">
            Collection: <span className="font-mono text-primary">{collName}</span>
          </span>
        </ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={operation === 'move' ? 'shadow' : 'flat'}
              color={operation === 'move' ? 'danger' : 'default'}
              radius="lg"
              className={operation === 'move' ? '' : 'border border-white/70 bg-white/75'}
              startContent={<MoveRight size={14} />}
              onPress={() => onOperationChange('move')}
            >
              移动
            </Button>
            <Button
              variant={operation === 'copy' ? 'shadow' : 'flat'}
              color={operation === 'copy' ? 'primary' : 'default'}
              radius="lg"
              className={operation === 'copy' ? '' : 'border border-white/70 bg-white/75'}
              startContent={<Copy size={14} />}
              onPress={() => onOperationChange('copy')}
            >
              复制
            </Button>
          </div>

          <Select
            label="传输方式"
            selectedKeys={[transferMethod]}
            onSelectionChange={keys => onTransferMethodChange([...keys][0] as ShardTransferMethod)}
          >
            <SelectItem key="stream_records">stream_records（默认，逐条传输）</SelectItem>
            <SelectItem key="snapshot">snapshot（传输索引和量化数据）</SelectItem>
            <SelectItem key="wal_delta">wal_delta（仅同步已有副本的差异）</SelectItem>
          </Select>

          {/* Shard badge */}
          <div className="flex justify-center py-1">
            <span
              className="font-mono font-bold text-sm px-4 py-2 rounded-full border shadow-sm"
              style={{ color: color.text, background: color.bg, borderColor: color.border }}
            >
              shard-{shardId}
            </span>
          </div>

          {/* From → To */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 rounded-2xl border border-white/80 bg-white/80 p-3 text-center shadow-sm shadow-default-100/50">
              <p className="text-xs text-default-400 mb-1">来源节点</p>
              <p className="font-mono text-xs text-primary break-all">{fromUri}</p>
              <p className="font-mono text-[10px] text-default-400 mt-1">{fromPeerId}</p>
            </div>
            <ArrowRight size={18} className="text-warning shrink-0" />
            <div className="flex-1 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-center shadow-sm shadow-warning/10">
              <p className="text-xs text-warning mb-1">目标节点</p>
              <p className="font-mono text-xs text-primary break-all">{toUri}</p>
              <p className="font-mono text-[10px] text-default-400 mt-1">{toPeerId}</p>
            </div>
          </div>

          {/* Warning */}
          <div className={`rounded-2xl border p-3 mt-1 ${isCopy ? 'bg-primary/10 border-primary/20' : 'bg-warning/10 border-warning/20'}`}>
            <p className={`text-xs leading-relaxed ${isCopy ? 'text-primary' : 'text-warning'}`}>
              {isCopy
                ? '复制操作会在目标节点创建该 shard 的副本，来源节点保留原 shard。此操作在后台异步执行。'
                : '移动操作将把 shard 数据迁移到目标节点，并从来源节点删除该 shard。此操作在后台异步执行。'}
            </p>
          </div>
        </ModalBody>
        <ModalFooter className="pt-2">
          <Button variant="flat" radius="lg" className="border border-white/70 bg-white/75" onPress={onClose}>取消</Button>
          <Button color={isCopy ? 'primary' : 'danger'} radius="lg" onPress={onConfirm} isLoading={isLoading}>
            {isCopy ? '确认复制' : '确认移动'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
