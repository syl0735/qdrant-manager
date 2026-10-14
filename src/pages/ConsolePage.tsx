import { useState } from 'react'
import {
  Button, Card, CardBody, CardHeader, Divider, Select, SelectItem, Input, Chip,
} from '@heroui/react'
import { Play, Trash2 } from 'lucide-react'
import { rawRequest } from '@/api/client'
import { useStore } from '@/store'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const SNIPPETS = [
  { label: 'GET collections', method: 'GET', path: '/collections', body: '' },
  { label: 'Cluster info', method: 'GET', path: '/cluster', body: '' },
  { label: 'Collection info', method: 'GET', path: '/collections/{name}', body: '' },
  { label: 'Collection cluster', method: 'GET', path: '/collections/{name}/cluster', body: '' },
  { label: 'Move shard', method: 'POST', path: '/collections/{name}/cluster', body: JSON.stringify({ move_shard: { shard_id: 0, from_peer_id: 0, to_peer_id: 0 } }, null, 2) },
  { label: 'Replicate shard', method: 'POST', path: '/collections/{name}/cluster', body: JSON.stringify({ replicate_shard: { shard_id: 0, from_peer_id: 0, to_peer_id: 0 } }, null, 2) },
  { label: 'Search', method: 'POST', path: '/collections/{name}/points/search', body: JSON.stringify({ vector: [], limit: 10, with_payload: true }, null, 2) },
  { label: 'Scroll', method: 'POST', path: '/collections/{name}/points/scroll', body: JSON.stringify({ limit: 10, with_payload: true, with_vector: false }, null, 2) },
  { label: 'Create snapshot', method: 'POST', path: '/collections/{name}/snapshots', body: '' },
]

export function ConsolePage() {
  const { selectedCollection } = useStore()
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/collections')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<{ ok: boolean; status: number; text: string } | null>(null)
  const [running, setRunning] = useState(false)

  const loadSnippet = (s: typeof SNIPPETS[0]) => {
    setMethod(s.method)
    setPath(s.path.replace('{name}', selectedCollection ?? '{name}'))
    setBody(s.body)
  }

  const run = async () => {
    setRunning(true)
    try {
      const res = await rawRequest(path, method, body)
      setResult({
        ok: res.ok,
        status: res.status,
        text: JSON.stringify(res.data, null, 2),
      })
    } catch (e) {
      setResult({ ok: false, status: 0, text: (e as Error).message })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">REST Console</h1>
        <p className="panel-subtitle">组合请求、快速加载常用片段，并直接查看 Qdrant 响应。</p>
      </div>

      <Card shadow="none" className="surface-card rounded-[28px] flex-1">
        <CardHeader className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex flex-col gap-1">
            <span className="panel-title">Console</span>
            <span className="panel-subtitle">支持常用 cluster / collection API，`⌘ + Enter` 直接执行。</span>
          </div>
          <span className="text-xs text-default-400">⌘ + Enter 执行</span>
        </CardHeader>
        <Divider className="opacity-60" />
        <CardBody className="flex flex-col gap-5 flex-1">
          {/* Snippets */}
          <div className="flex flex-wrap gap-2 rounded-[24px] border border-default-200/80 bg-default-100/85 p-4">
            {SNIPPETS.map((s, i) => (
              <button
                key={i}
                onClick={() => loadSnippet(s)}
                className="font-mono text-[10px] px-2.5 py-1.5 rounded-xl border border-default-200/80 bg-white text-default-500 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Method + Path */}
          <div className="flex gap-2 items-center rounded-[24px] border border-default-200/80 bg-default-100/85 p-4">
            <Select
              size="sm" className="w-28"
              variant="bordered"
              selectedKeys={[method]}
              classNames={{ trigger: 'rounded-2xl border-default-200/80 bg-white shadow-none' }}
              onSelectionChange={k => setMethod([...k][0] as string)}
            >
              {METHODS.map(m => <SelectItem key={m}><span className="font-mono text-xs">{m}</span></SelectItem>)}
            </Select>
            <Input
              size="sm" value={path} onValueChange={setPath}
              variant="bordered"
              classNames={{ inputWrapper: 'font-mono text-xs flex-1 rounded-2xl border-default-200/80 bg-white shadow-none' }}
              className="flex-1"
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run() }}
            />
            <Button size="sm" color="primary" variant="shadow" radius="lg"
              startContent={<Play size={12} />} onPress={run} isLoading={running}>
              执行
            </Button>
            <Button size="sm" variant="flat" radius="lg" className="border border-default-200/80 bg-white" isIconOnly onPress={() => { setBody(''); setResult(null) }}>
              <Trash2 size={13} />
            </Button>
          </div>

          {/* Two panes */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0 xl:[grid-auto-rows:minmax(0,1fr)]" style={{ minHeight: '460px' }}>
            <div className="flex flex-col gap-2 rounded-[24px] border border-default-200/80 bg-default-100/85 p-4 min-h-0">
              <p className="text-[11px] text-default-400 uppercase tracking-[0.2em]">请求 Body</p>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run() }}
                placeholder="GET 请求无需 body"
                className="flex-1 min-h-[220px] xl:min-h-0 w-full rounded-[20px] border border-default-200/80 bg-white font-mono text-xs p-4 resize-none outline-none focus:border-primary/50 text-foreground leading-relaxed shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-2 rounded-[24px] border border-default-200/80 bg-default-100/85 p-4 min-h-0">
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-default-400 uppercase tracking-[0.2em]">响应</p>
                {result && (
                  <Chip size="sm" color={result.ok ? 'success' : 'danger'} variant="flat" className="font-mono text-xs border border-white/70">
                    HTTP {result.status}
                  </Chip>
                )}
              </div>
              <div className="flex-1 min-h-[220px] xl:min-h-0 rounded-[20px] border border-default-200/80 bg-white font-mono text-xs p-4 overflow-auto leading-relaxed shadow-sm">
                {result ? (
                  <pre className={result.ok ? 'text-success' : 'text-danger'}>{result.text}</pre>
                ) : (
                  <span className="text-default-400">等待执行…</span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
