import { Card, CardBody, CardHeader, Chip, Divider, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react'
import { useStore } from '@/store'
import { StatCard } from '@/components/shared/StatCard'
import { MonoText } from '@/components/shared/MonoText'
import { formatCount } from '@/api/utils'

export function ClusterPage() {
  const { cluster, collections, setSelectedCollection, setActiveView } = useStore()

  if (!cluster) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-default-400 gap-3">
        <span className="text-5xl">⬡</span>
        <p className="text-sm">无法获取集群信息（单节点模式或未连接）</p>
      </div>
    )
  }

  const peers = Object.entries(cluster.peers ?? {}).sort(([left], [right]) => {
    try {
      const leftId = BigInt(left)
      const rightId = BigInt(right)
      return leftId < rightId ? -1 : leftId > rightId ? 1 : 0
    } catch {
      return left.localeCompare(right, undefined, { numeric: true })
    }
  })
  const raft = cluster.raft_info
  const isCluster = cluster.status === 'enabled'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">集群总览</h1>
        <p className="panel-subtitle">Raft 状态、节点角色和 collections 总体分布。</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="集群状态" value={isCluster ? '集群' : '单节点'} color={isCluster ? 'success' : 'warning'} sub={cluster.status} />
        <StatCard label="节点数" value={peers.length || 1} color="primary" sub="peer nodes" />
        <StatCard label="Collections" value={collections.length} color="warning" />
        <StatCard label="本节点 ID" value={<span className="text-sm">{cluster.peer_id || '—'}</span>} />
        {raft && <>
          <StatCard label="Raft Term" value={raft.term ?? '—'} sub={`commit: ${raft.commit ?? '—'}`} />
          <StatCard label="Pending Ops" value={raft.pending_operations ?? 0} color={raft.pending_operations > 0 ? 'warning' : 'default'} sub={`leader: ${raft.leader ?? '—'}`} />
        </>}
      </div>

      {/* Nodes */}
      {peers.length > 0 && (
        <Card shadow="none" className="surface-card rounded-[28px]">
          <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5 pb-4">
            <span className="panel-title">节点列表</span>
            <span className="panel-subtitle">查看当前 API 节点与所有 peer 的角色和地址。</span>
          </CardHeader>
          <Divider className="opacity-60" />
          <CardBody className="p-0">
            <Table removeWrapper aria-label="nodes" classNames={{ th: 'bg-transparent text-default-400 text-[11px] uppercase tracking-[0.18em]', td: 'py-4' }}>
              <TableHeader>
                <TableColumn>节点</TableColumn>
                <TableColumn>Raft 角色</TableColumn>
                <TableColumn>URI</TableColumn>
                <TableColumn>Peer ID</TableColumn>
                <TableColumn>版本号</TableColumn>
              </TableHeader>
              <TableBody>
                {peers.map(([id, peer]) => (
                  <TableRow key={id}>
                    <TableCell>
                      <Chip size="sm" color={String(id) === String(cluster.peer_id) ? 'warning' : 'primary'} variant="flat">
                        {String(id) === String(cluster.peer_id) ? '本节点' : '远程'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color={peer.role === 'Leader' ? 'success' : 'default'} variant="flat">
                        {peer.role ?? '—'}
                      </Chip>
                    </TableCell>
                    <TableCell><MonoText className="text-primary">{peer.uri}</MonoText></TableCell>
                    <TableCell><MonoText dim>{id}</MonoText></TableCell>
                    <TableCell><MonoText>{peer.version ?? '—'}</MonoText></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Collections overview */}
      <Card shadow="none" className="surface-card rounded-[28px]">
        <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5 pb-4">
          <span className="panel-title">Collections 概览</span>
          <span className="panel-subtitle">按 points 排序，点击任意 collection 进入详情。</span>
        </CardHeader>
        <Divider className="opacity-60" />
        <CardBody className="p-0">
          <Table removeWrapper aria-label="collections overview" classNames={{ th: 'bg-transparent text-default-400 text-[11px] uppercase tracking-[0.18em]', td: 'py-4' }}>
            <TableHeader>
              <TableColumn>名称</TableColumn>
              <TableColumn>向量数</TableColumn>
              <TableColumn>Points</TableColumn>
              <TableColumn>Shards</TableColumn>
              <TableColumn>副本</TableColumn>
              <TableColumn>状态</TableColumn>
            </TableHeader>
            <TableBody>
              {collections.map(c => {
                const cfg = c.info?.config?.params
                const st = c.info?.status ?? '—'
                return (
                  <TableRow
                    key={c.name}
                    className="cursor-pointer hover:bg-white/70"
                    onClick={() => {
                      setSelectedCollection(c.name)
                      setActiveView('collections')
                    }}
                  >
                    <TableCell><MonoText className="text-primary">{c.name}</MonoText></TableCell>
                    <TableCell><MonoText>{c.info?.vectors_count != null ? formatCount(c.info.vectors_count) : '—'}</MonoText></TableCell>
                    <TableCell><MonoText>{c.info?.points_count != null ? formatCount(c.info.points_count) : '—'}</MonoText></TableCell>
                    <TableCell><MonoText>{cfg?.shard_number ?? '—'}</MonoText></TableCell>
                    <TableCell><MonoText>{cfg?.replication_factor ?? '—'}</MonoText></TableCell>
                    <TableCell>
                      <Chip size="sm" color={st === 'green' ? 'success' : st === 'yellow' ? 'warning' : 'primary'} variant="flat">
                        {st}
                      </Chip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  )
}
