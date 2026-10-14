import { useState } from 'react'
import {
  Button, Card, CardBody, CardHeader, Divider, Select, SelectItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from '@heroui/react'
import { RefreshCw, Plus, Download, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { fetchSnapshots, createSnapshot, deleteSnapshot } from '@/api/client'
import { formatBytes } from '@/api/utils'
import { addToast } from '@heroui/react'
import type { Snapshot } from '@/types'

export function SnapshotsPage() {
  const { collections, url } = useStore()
  const [selectedColl, setSelectedColl] = useState<string>('')
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingSnap, setDeletingSnap] = useState<string | null>(null)

  const load = async (name?: string) => {
    const coll = name ?? selectedColl
    if (!coll) return
    setLoading(true)
    try {
      const snaps = await fetchSnapshots(coll)
      setSnapshots(snaps)
    } catch (e) {
      addToast({ title: '加载失败', description: (e as Error).message, color: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedColl) return
    setCreating(true)
    try {
      await createSnapshot(selectedColl)
      addToast({ title: '快照已创建', color: 'success' })
      await load()
    } catch (e) {
      addToast({ title: '创建失败', description: (e as Error).message, color: 'danger' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (snapName: string) => {
    if (!confirm(`确认删除快照 ${snapName}？`)) return
    setDeletingSnap(snapName)
    try {
      await deleteSnapshot(selectedColl, snapName)
      addToast({ title: '已删除', color: 'success' })
      await load()
    } catch (e) {
      addToast({ title: '删除失败', description: (e as Error).message, color: 'danger' })
    } finally {
      setDeletingSnap(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">快照管理</h1>
        <p className="panel-subtitle">选择 collection，创建、下载和清理快照文件。</p>
      </div>

      <Card shadow="none" className="surface-card rounded-[28px]">
        <CardHeader className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex flex-col gap-1">
            <span className="panel-title">Snapshots</span>
            <span className="panel-subtitle">当前节点暴露的 collection 快照列表。</span>
          </div>
        </CardHeader>
        <Divider className="opacity-60" />
        <CardBody className="flex flex-col gap-5">
          {/* Controls */}
          <div className="flex flex-wrap items-end gap-3 rounded-[24px] border border-default-200/80 bg-default-100/85 p-4">
            <Select
              label="选择 Collection"
              size="sm"
              variant="bordered"
              className="max-w-xs"
              selectedKeys={selectedColl ? [selectedColl] : []}
              classNames={{ trigger: 'rounded-2xl border-default-200/80 bg-white shadow-none' }}
              onSelectionChange={k => {
                const name = [...k][0] as string
                setSelectedColl(name)
                load(name)
              }}
            >
              {collections.map(c => <SelectItem key={c.name}>{c.name}</SelectItem>)}
            </Select>
            <Button size="sm" variant="flat" radius="lg" className="border border-default-200/80 bg-white" isIconOnly onPress={() => load()} isLoading={loading}>
              <RefreshCw size={14} />
            </Button>
            <Button size="sm" color="success" variant="shadow" radius="lg" startContent={<Plus size={13} />}
              onPress={handleCreate} isLoading={creating} isDisabled={!selectedColl}>
              创建快照
            </Button>
          </div>

          {/* Table */}
          {snapshots.length > 0 ? (
            <Table removeWrapper aria-label="snapshots" classNames={{ th: 'bg-transparent text-default-400 text-[11px] uppercase tracking-[0.18em]', td: 'py-4' }}>
              <TableHeader>
                <TableColumn>文件名</TableColumn>
                <TableColumn>大小</TableColumn>
                <TableColumn>创建时间</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody>
                {snapshots.map(s => (
                  <TableRow key={s.name} className="hover:bg-white/70">
                    <TableCell>
                      <span className="font-mono text-xs">{s.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{s.size ? formatBytes(s.size) : '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-default-400">{s.creation_time ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="flat" radius="lg" className="border border-default-200/80 bg-white" isIconOnly
                          as="a" href={`${url}/collections/${selectedColl}/snapshots/${s.name}`} target="_blank">
                          <Download size={12} />
                        </Button>
                        <Button size="sm" color="danger" variant="flat" radius="lg" className="border border-danger/10" isIconOnly
                          isLoading={deletingSnap === s.name}
                          onPress={() => handleDelete(s.name)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-[24px] border border-dashed border-default-300 bg-default-100/75 px-4 py-10 text-center">
              <p className="text-sm text-default-400">
                {selectedColl ? '暂无快照' : '请先选择 collection'}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
