import { useState, useCallback, useEffect } from 'react'
import {
  Button, Card, CardBody, CardHeader, Chip, Divider,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  useDisclosure,
} from '@heroui/react'
import { Plus, ArrowLeft, Camera, Trash2, ChevronDown } from 'lucide-react'
import { useStore } from '@/store'
import { StatCard } from '@/components/shared/StatCard'
import { MonoText } from '@/components/shared/MonoText'
import { ShardBoard } from '@/components/collections/ShardBoard'
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal'
import { deleteCollection } from '@/api/client'
import { createSnapshot } from '@/api/client'
import { formatCount, formatBytes } from '@/api/utils'
import { useTransfer } from '@/hooks/useTransfer'
import { addToast } from '@heroui/react'
import { notifyShardTransferComplete } from '@/api/browserNotification'

export function CollectionsPage() {
  const { collections, selectedCollection, setSelectedCollection, loadCollections, refresh } = useStore()
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure()
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const handleTransferComplete = useCallback((collName: string, shardId: number) => {
    addToast({ title: `Shard ${shardId} 迁移完成 ✓`, color: 'success' })
    notifyShardTransferComplete(collName, shardId)
    refresh()
  }, [refresh])

  const { transfers, startPolling, syncPolling } = useTransfer(handleTransferComplete)

  const handleDelete = async (name: string) => {
    if (!confirm(`确认删除 Collection "${name}"？此操作不可撤销！`)) return
    setDeletingName(name)
    try {
      await deleteCollection(name)
      addToast({ title: `已删除 "${name}"`, color: 'success' })
      if (selectedCollection === name) setSelectedCollection(null)
      await loadCollections()
    } catch (e) {
      addToast({ title: '删除失败', description: (e as Error).message, color: 'danger' })
    } finally {
      setDeletingName(null)
    }
  }

  const handleSnapshot = async (name: string) => {
    try {
      await createSnapshot(name)
      addToast({ title: '快照已创建', color: 'success' })
    } catch (e) {
      addToast({ title: '快照失败', description: (e as Error).message, color: 'danger' })
    }
  }

  // Detail view
  const coll = selectedCollection ? collections.find(c => c.name === selectedCollection) : null

  useEffect(() => {
    if (!coll?.cluster) return
    if ((coll.cluster.shard_transfers?.length ?? 0) === 0) return
    void syncPolling(coll.name)
  }, [coll?.name, coll?.cluster, syncPolling])

  useEffect(() => {
    setIsConfigOpen(false)
  }, [coll?.name])

  if (coll) {
    const info = coll.info
    const cl = coll.cluster
    const cfg = info?.config?.params

    // Only show transfers relevant to this collection
    const collTransfers = transfers.filter(t =>
      t.collName === coll.name && (
        cl?.local_shards.some(s => s.shard_id === t.shardId) ||
        cl?.remote_shards.some(s => s.shard_id === t.shardId)
      )
    )

    return (
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button size="sm" variant="flat" radius="lg" className="bg-white/75 border border-white/70" startContent={<ArrowLeft size={13} />} onPress={() => setSelectedCollection(null)}>
            返回
          </Button>
          <div className="flex flex-col gap-0.5">
            <MonoText className="text-primary text-lg font-semibold">{coll.name}</MonoText>
            <span className="panel-subtitle">Collection details, shard placement and live transfer status.</span>
          </div>
          {info?.status && (
            <Chip size="sm" color={info.status === 'green' ? 'success' : 'warning'} variant="flat">{info.status}</Chip>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="flat" radius="lg" className="bg-white/75 border border-white/70" startContent={<Camera size={13} />} onPress={() => handleSnapshot(coll.name)}>快照</Button>
            <Button size="sm" color="danger" variant="flat" radius="lg" className="border border-danger/10"
              onPress={() => handleDelete(coll.name)} isLoading={deletingName === coll.name}>删除</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="向量数" value={info?.vectors_count != null ? formatCount(info.vectors_count) : '—'} color="warning" />
          <StatCard label="Points" value={info?.points_count != null ? formatCount(info.points_count) : '—'} color="primary" />
          <StatCard label="Shards" value={cfg?.shard_number ?? '—'} />
          <StatCard label="副本因子" value={cfg?.replication_factor ?? '—'} />
          <StatCard label="磁盘" value={info?.disk_data_size ? formatBytes(info.disk_data_size) : '—'} />
          <StatCard label="内存" value={info?.ram_data_size ? formatBytes(info.ram_data_size) : '—'} />
        </div>

        {/* Shard board */}
        <Card shadow="none" className="surface-card rounded-[28px]">
          <CardHeader className="flex items-center justify-between px-5 pt-5 pb-4">
            <span className="panel-title">Shard 分布</span>
            {cl && Object.keys(useStore.getState().cluster?.peers ?? {}).length > 1 && (
              <span className="text-xs text-default-400">拖拽 shard 卡片到目标节点后选择移动或复制</span>
            )}
          </CardHeader>
          <Divider className="opacity-60" />
          <CardBody>
            {cl ? (
              <ShardBoard
                collName={coll.name}
                clusterInfo={cl}
                transfers={collTransfers}
                onTransferStart={(shardId, fromPeerId) => startPolling(coll.name, shardId, fromPeerId)}
                onRefresh={refresh}
              />
            ) : (
              <p className="text-sm text-default-400 text-center py-8">无集群分片信息（单节点模式）</p>
            )}
          </CardBody>
        </Card>

        {/* Config */}
        <Card shadow="none" className="surface-card rounded-[28px]">
          <CardHeader
            className="flex items-center justify-between px-5 py-5 text-sm font-semibold cursor-pointer select-none"
            onClick={() => setIsConfigOpen(v => !v)}
          >
            <div className="flex flex-col gap-1">
              <span className="panel-title">配置详情</span>
              <span className="panel-subtitle">默认折叠，按需查看当前 collection 配置原文。</span>
            </div>
            <ChevronDown
              size={16}
              className={`text-default-400 transition-transform ${isConfigOpen ? 'rotate-180' : ''}`}
            />
          </CardHeader>
          {isConfigOpen && (
            <>
              <Divider className="opacity-60" />
              <CardBody>
                <pre className="font-mono text-xs text-default-500 leading-relaxed overflow-auto rounded-2xl bg-default-100/70 p-4">
                  {JSON.stringify(info?.config ?? {}, null, 2)}
                </pre>
              </CardBody>
            </>
          )}
        </Card>
      </div>
    )
  }

  // List view
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="panel-subtitle">浏览、创建和维护所有 collections。</p>
      </div>

      <Card shadow="none" className="surface-card rounded-[28px]">
        <CardHeader className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex flex-col gap-1">
            <span className="panel-title">Collections 列表</span>
            <span className="panel-subtitle">点击任意行进入 shard 详情和迁移视图。</span>
          </div>
          <Button size="sm" color="primary" variant="shadow" radius="lg" startContent={<Plus size={13} />} onPress={onCreateOpen}>
            新建 Collection
          </Button>
        </CardHeader>
        <Divider className="opacity-60" />
        <CardBody className="p-0">
          <Table removeWrapper aria-label="collections" classNames={{ th: 'bg-transparent text-default-400 text-[11px] uppercase tracking-[0.18em]', td: 'py-4' }}>
            <TableHeader>
              <TableColumn>名称</TableColumn>
              <TableColumn>向量数</TableColumn>
              <TableColumn>Points</TableColumn>
              <TableColumn>Shards</TableColumn>
              <TableColumn>副本</TableColumn>
              <TableColumn>距离函数</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody>
              {collections.map(c => {
                const cfg = c.info?.config?.params
                const vecs = cfg?.vectors
                const dist = vecs && typeof vecs === 'object' && !Array.isArray(vecs)
                  ? (Object.values(vecs)[0] as { distance?: string })?.distance ?? (vecs as { distance?: string })?.distance ?? '—'
                  : '—'
                const st = c.info?.status ?? '—'
                return (
                  <TableRow key={c.name} className="cursor-pointer hover:bg-white/70"
                    onClick={() => setSelectedCollection(c.name)}>
                    <TableCell><MonoText className="text-primary font-semibold">{c.name}</MonoText></TableCell>
                    <TableCell><MonoText>{c.info?.vectors_count != null ? formatCount(c.info.vectors_count) : '—'}</MonoText></TableCell>
                    <TableCell><MonoText>{c.info?.points_count != null ? formatCount(c.info.points_count) : '—'}</MonoText></TableCell>
                    <TableCell><MonoText>{cfg?.shard_number ?? '—'}</MonoText></TableCell>
                    <TableCell><MonoText>{cfg?.replication_factor ?? '—'}</MonoText></TableCell>
                    <TableCell><MonoText>{dist}</MonoText></TableCell>
                    <TableCell>
                      <Chip size="sm" color={st === 'green' ? 'success' : 'primary'} variant="flat">{st}</Chip>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="sm" variant="flat" isIconOnly
                          onPress={() => handleSnapshot(c.name)}><Camera size={12} /></Button>
                        <Button size="sm" color="danger" variant="flat" isIconOnly
                          isLoading={deletingName === c.name}
                          onPress={() => handleDelete(c.name)}><Trash2 size={12} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <CreateCollectionModal isOpen={isCreateOpen} onClose={onCreateClose} onCreated={loadCollections} />
    </div>
  )
}
