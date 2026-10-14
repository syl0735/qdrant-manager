import { Button, Chip, Divider, ScrollShadow } from '@heroui/react'
import {
  Hexagon, LayoutGrid, Camera, Terminal, ChevronRight,
} from 'lucide-react'
import { useStore } from '@/store'
import { formatCount } from '@/api/utils'

const NAV_ITEMS = [
  { key: 'cluster' as const, label: '集群总览', icon: Hexagon },
  { key: 'collections' as const, label: 'Collections', icon: LayoutGrid },
  { key: 'snapshots' as const, label: '快照', icon: Camera },
  { key: 'console' as const, label: 'REST Console', icon: Terminal },
]

export function Sidebar() {
  const { activeView, setActiveView, collections, selectedCollection, setSelectedCollection, connected } = useStore()

  const handleCollectionClick = (name: string) => {
    setSelectedCollection(name)
    setActiveView('collections')
  }

  return (
    <aside className="w-64 shrink-0 rounded-[28px] surface-card flex flex-col overflow-hidden">
      {/* Nav */}
      <nav className="p-3 flex flex-col gap-1.5">
        <div className="px-2 pt-2 pb-1">
          <p className="text-[11px] text-default-400 uppercase tracking-[0.2em] font-medium">视图</p>
        </div>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key
          return (
            <Button
              key={key}
              variant={isActive ? 'shadow' : 'light'}
              color={isActive ? 'primary' : 'default'}
              size="md"
              radius="lg"
              className={`justify-start gap-2 h-11 font-medium ${!isActive ? 'text-default-600' : ''}`}
              startContent={<Icon size={14} />}
              onPress={() => setActiveView(key)}
            >
              {label}
            </Button>
          )
        })}
      </nav>

      <Divider className="opacity-60" />

      {/* Collections list */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <p className="text-[11px] text-default-400 uppercase tracking-[0.2em] font-medium">Collections</p>
          {collections.length > 0 && (
            <Chip size="sm" variant="flat" className="text-xs min-w-0 border border-white/70 bg-white/75">{collections.length}</Chip>
          )}
        </div>
        <ScrollShadow className="flex-1 px-3 pb-3">
          {!connected ? (
            <p className="text-xs text-default-400 px-3 py-2">未连接</p>
          ) : collections.length === 0 ? (
            <p className="text-xs text-default-400 px-3 py-2">无 collections</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {collections.map(c => {
                const isActive = selectedCollection === c.name && activeView === 'collections'
                const count = c.info?.vectors_count
                const activeTransfers = c.cluster?.shard_transfers?.length ?? 0
                const hasActiveTransfer = activeTransfers > 0
                return (
                  <button
                    key={c.name}
                    onClick={() => handleCollectionClick(c.name)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left
                      transition-all text-xs group border
                      ${isActive
                        ? 'bg-primary/10 text-primary border-primary/15 shadow-sm shadow-primary/10'
                        : 'text-default-500 border-transparent hover:text-foreground hover:bg-default-50/90 hover:border-default-200/80'}
                    `}
                  >
                    <ChevronRight size={12} className={`shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                    <span className="font-mono truncate flex-1">{c.name}</span>
                    {hasActiveTransfer && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-danger/15 bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger shrink-0"
                        title={`${activeTransfers} 个 shard 正在迁移`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-danger transfer-pulse shrink-0" />
                        {activeTransfers}
                      </span>
                    )}
                    {count != null && (
                      <span className="text-default-400 font-mono shrink-0 text-[10px] bg-default-200/70 px-1.5 py-0.5 rounded-full">
                        {formatCount(count)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollShadow>
      </div>
    </aside>
  )
}
