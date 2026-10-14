import { useEffect, useState } from 'react'
import {
  Button, Input, Chip, Spinner, Tooltip,
} from '@heroui/react'
import { RefreshCw, Plug } from 'lucide-react'
import { useStore } from '@/store'
import { StatusDot } from '@/components/shared/StatusDot'
import { addToast } from '@heroui/react'

export function TopBar() {
  const { url, apiKey, connected, version, connecting, loading, connect, refresh } = useStore()
  const [inputUrl, setInputUrl] = useState(url)
  const [inputKey, setInputKey] = useState(apiKey)

  useEffect(() => {
    setInputUrl(url)
  }, [url])

  useEffect(() => {
    setInputKey(apiKey)
  }, [apiKey])

  const handleConnect = async () => {
    try {
      await connect(inputUrl, inputKey)
      addToast({ title: '连接成功', description: `Qdrant v${version}`, color: 'success' })
    } catch (e) {
      addToast({ title: '连接失败', description: (e as Error).message, color: 'danger' })
    }
  }

  return (
    <header className="px-4 pt-4 pb-3 shrink-0 z-50">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="w-64 shrink-0 flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-warning to-amber-300 shadow-sm shadow-warning/30 flex items-center justify-center">
            <span className="text-black font-bold text-sm">Q</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm tracking-tight">
              Qdrant <span className="text-default-400 font-normal">Manager</span>
            </span>
            <span className="text-[11px] text-default-400">Cluster operations workspace</span>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          {/* Connection bar */}
          <div className="surface-card rounded-2xl px-3 py-2 flex items-center gap-2 w-full max-w-4xl">
            <div className="flex items-center gap-2 pl-1 pr-2 shrink-0">
              <StatusDot status={connected ? 'ok' : 'idle'} pulse={connected} />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-default-400">
                API
              </span>
            </div>
            <Input
              size="sm"
              placeholder="http://localhost:6333"
              value={inputUrl}
              onValueChange={setInputUrl}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              variant="bordered"
              classNames={{
                base: 'flex-1',
                inputWrapper: 'font-mono text-xs h-10 rounded-xl border-white/80 bg-white/80 shadow-none',
              }}
            />
            <Input
              size="sm"
              placeholder="API Key（可选）"
              type="password"
              value={inputKey}
              onValueChange={setInputKey}
              variant="bordered"
              classNames={{
                base: 'w-48',
                inputWrapper: 'font-mono text-xs h-10 rounded-xl border-white/80 bg-white/80 shadow-none',
              }}
            />
            <Button
              size="md"
              color="primary"
              variant="shadow"
              startContent={connecting ? <Spinner size="sm" color="primary" /> : <Plug size={13} />}
              onPress={handleConnect}
              isDisabled={connecting}
              className="shrink-0 rounded-xl font-medium"
            >
              {connecting ? '连接中' : '连接'}
            </Button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {version && (
              <Chip size="sm" variant="flat" color="default" className="font-mono text-xs border border-white/70 bg-white/75">
                v{version}
              </Chip>
            )}
            <Tooltip content="刷新数据">
              <Button
                isIconOnly size="sm" variant="flat" className="rounded-xl border border-white/70 bg-white/75"
                onPress={refresh} isDisabled={!connected || loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  )
}
