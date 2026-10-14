import { create } from 'zustand'
import type { ClusterInfo, Collection } from '@/types'
import {
  setConnection, fetchVersion, fetchCluster,
  fetchCollectionClusterSafe, fetchCollectionInfoSafe, fetchCollectionNames,
} from '@/api/client'

let collectionLoadSeq = 0
const DEFAULT_URL = 'http://localhost:6333'
const SAVED_URL_KEY = 'qdrant-manager.url'

function getSavedUrl(): string {
  try {
    return localStorage.getItem(SAVED_URL_KEY) || DEFAULT_URL
  } catch {
    return DEFAULT_URL
  }
}

function saveUrl(url: string) {
  try {
    localStorage.setItem(SAVED_URL_KEY, url)
  } catch {
    // Ignore storage failures, such as private browsing restrictions.
  }
}

function sortCollections(collections: Collection[]): Collection[] {
  return [...collections].sort((a, b) => {
    const pointDiff = (b.info?.points_count ?? -1) - (a.info?.points_count ?? -1)
    if (pointDiff !== 0) return pointDiff
    return a.name.localeCompare(b.name)
  })
}

interface ConnectionState {
  url: string
  apiKey: string
  connected: boolean
  version: string
  connecting: boolean
  error: string | null
}

interface DataState {
  cluster: ClusterInfo | null
  collections: Collection[]
  loading: boolean
}

interface UIState {
  selectedCollection: string | null
  activeView: 'cluster' | 'collections' | 'snapshots' | 'console'
}

interface AppStore extends ConnectionState, DataState, UIState {
  // Connection
  connect: (url: string, apiKey: string) => Promise<void>
  switchNode: (peerUri: string) => Promise<void>

  // Data
  refresh: () => Promise<void>
  loadCluster: () => Promise<void>
  loadCollections: () => Promise<void>

  // UI
  setSelectedCollection: (name: string | null) => void
  setActiveView: (view: UIState['activeView']) => void
}

export const useStore = create<AppStore>((set, get) => ({
  // Connection
  url: getSavedUrl(),
  apiKey: '',
  connected: false,
  version: '',
  connecting: false,
  error: null,

  // Data
  cluster: null,
  collections: [],
  loading: false,

  // UI
  selectedCollection: null,
  activeView: 'cluster',

  connect: async (url, apiKey) => {
    set({ connecting: true, error: null })
    try {
      setConnection(url, apiKey)
      const version = await fetchVersion()
      saveUrl(url)
      set({ url, apiKey, connected: true, version, connecting: false })
      await get().refresh()
    } catch (e) {
      set({ connected: false, connecting: false, error: (e as Error).message })
      throw e
    }
  },

  switchNode: async (peerUri: string) => {
    try {
      const current = new URL(get().url)
      const target = new URL(peerUri)
      current.hostname = target.hostname
      const newUrl = current.toString().replace(/\/$/, '')
      await get().connect(newUrl, get().apiKey)
    } catch {
      await get().connect(peerUri, get().apiKey)
    }
  },

  refresh: async () => {
    set({ loading: true })
    try {
      await get().loadCluster()
      await get().loadCollections()
    } finally {
      set({ loading: false })
    }
  },

  loadCluster: async () => {
    try {
      const cluster = await fetchCluster()
      set({ cluster })
    } catch {
      set({ cluster: null })
    }
  },

  loadCollections: async () => {
    const seq = ++collectionLoadSeq
    try {
      const names = await fetchCollectionNames()
      if (seq !== collectionLoadSeq) return

      const existingByName = new Map(get().collections.map(collection => [collection.name, collection]))
      const skeletons = names.map(name => existingByName.get(name) ?? { name, info: null, cluster: null })
      set({ collections: sortCollections(skeletons) })

      names.forEach(name => {
        void fetchCollectionInfoSafe(name).then(info => {
          if (seq !== collectionLoadSeq) return
          set(state => {
            if (!state.collections.some(item => item.name === name)) return state
            return {
              collections: sortCollections(
                state.collections.map(item => item.name === name ? { ...item, info } : item)
              ),
            }
          })
        })

        void fetchCollectionClusterSafe(name, get().cluster).then(cluster => {
          if (seq !== collectionLoadSeq) return
          set(state => {
            if (!state.collections.some(item => item.name === name)) return state
            return {
              collections: sortCollections(
                state.collections.map(item => item.name === name ? { ...item, cluster } : item)
              ),
            }
          })
        })
      })
    } catch {
      if (seq !== collectionLoadSeq) return
      set({ collections: [] })
    }
  },

  setSelectedCollection: (name) => set({ selectedCollection: name }),
  setActiveView: (view) => set({ activeView: view }),
}))
