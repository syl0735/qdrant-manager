import { useStore } from '@/store'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ClusterPage } from '@/pages/ClusterPage'
import { CollectionsPage } from '@/pages/CollectionsPage'
import { SnapshotsPage } from '@/pages/SnapshotsPage'
import { ConsolePage } from '@/pages/ConsolePage'
import { ScrollShadow } from '@heroui/react'

export default function App() {
  const { activeView, connected } = useStore()

  const renderPage = () => {
    if (!connected) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-default-400">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
            <span className="text-3xl font-bold text-warning">Q</span>
          </div>
          <p className="text-sm">输入 Qdrant 地址并点击连接</p>
        </div>
      )
    }
    switch (activeView) {
      case 'cluster': return <ClusterPage />
      case 'collections': return <CollectionsPage />
      case 'snapshots': return <SnapshotsPage />
      case 'console': return <ConsolePage />
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent">
      <TopBar />
      <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-4">
        <Sidebar />
        <ScrollShadow className="flex-1 overflow-y-auto rounded-[28px] surface-panel">
          <main className="p-6 md:p-7 flex flex-col gap-6 min-h-full">
            {renderPage()}
          </main>
        </ScrollShadow>
      </div>
    </div>
  )
}
