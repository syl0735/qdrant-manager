import { safeJsonParse } from './safeJson'
import type {
  ClusterInfo, Collection, CollectionClusterInfo,
  CollectionInfo, Snapshot, ShardTransfer,
} from '@/types'

let _baseUrl = 'http://localhost:6333'
let _apiKey = ''
const REQUEST_TIMEOUT_MS = 8000

export function setConnection(url: string, apiKey: string) {
  _baseUrl = url.replace(/\/$/, '')
  _apiKey = apiKey
}

export function getBaseUrl() { return _baseUrl }

async function fetchTextWithTimeout(
  url: string,
  opts: RequestInit,
  ms = REQUEST_TIMEOUT_MS
): Promise<{ response: Response; text: string }> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), ms)
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal })
    return { response, text: await response.text() }
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Request timed out after ${ms}ms`)
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function resolveNodeBaseUrl(peerUri: string, currentBaseUrl = _baseUrl): string {
  try {
    const current = new URL(currentBaseUrl)
    const target = new URL(peerUri)
    current.hostname = target.hostname
    return current.toString().replace(/\/$/, '')
  } catch {
    return peerUri.replace(/\/$/, '')
  }
}

async function requestToBaseUrl<T>(
  baseUrl: string,
  path: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_apiKey) headers['api-key'] = _apiKey
  const opts: RequestInit = { method, headers }
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body)
  const { response: r, text } = await fetchTextWithTimeout(baseUrl + path, opts)
  const data = safeJsonParse(text) as { result?: T; status?: { error?: string } }
  if (!r.ok) throw new Error(data.status?.error ?? text)
  return data.result as T
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return requestToBaseUrl<T>(_baseUrl, path, method, body)
}

// Raw request that returns full response (for console)
export async function rawRequest(
  path: string, method: string, bodyStr: string
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_apiKey) headers['api-key'] = _apiKey
  const opts: RequestInit = { method, headers }
  if (bodyStr.trim()) opts.body = bodyStr
  const { response: r, text } = await fetchTextWithTimeout(_baseUrl + path, opts)
  let data: unknown
  try { data = safeJsonParse(text) } catch { data = { error: 'Invalid JSON' } }
  return { ok: r.ok, status: r.status, data }
}

export async function fetchVersion(): Promise<string> {
  return fetchVersionFromBaseUrl(_baseUrl)
}

async function fetchVersionFromBaseUrl(baseUrl: string): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_apiKey) headers['api-key'] = _apiKey
  const { response: r, text } = await fetchTextWithTimeout(baseUrl + '/', { headers })
  const data = safeJsonParse(text) as { version?: string }
  if (!r.ok) throw new Error('Connection failed')
  return data.version ?? '?'
}

export async function fetchCluster(): Promise<ClusterInfo> {
  const cluster = await request<ClusterInfo>('/cluster')
  return enrichClusterWithNodeRoles(cluster)
}

async function fetchClusterFromNode(peerUri: string): Promise<ClusterInfo> {
  const nodeBaseUrl = resolveNodeBaseUrl(peerUri)
  return requestToBaseUrl<ClusterInfo>(nodeBaseUrl, '/cluster')
}

async function enrichClusterWithNodeRoles(cluster: ClusterInfo): Promise<ClusterInfo> {
  const nodeTargets = [
    { peerId: String(cluster.peer_id), peerUri: _baseUrl },
    ...Object.entries(cluster.peers ?? {}).map(([peerId, peer]) => ({ peerId, peerUri: peer.uri })),
  ]

  const uniqueTargets = Array.from(
    new Map(nodeTargets.map(target => [target.peerId, target])).values()
  )

  const nodeDetails = await Promise.all(
    uniqueTargets.map(async ({ peerId, peerUri }) => {
      const [nodeCluster, version] = await Promise.all([
        fetchClusterFromNode(peerUri).catch(() => null),
        fetchVersionFromBaseUrl(resolveNodeBaseUrl(peerUri)).catch(() => null),
      ])
      return { peerId, nodeCluster, version }
    })
  )

  const roleByPeerId = new Map<string, string | null>()
  const versionByPeerId = new Map<string, string | null>()
  nodeDetails.forEach(({ peerId, nodeCluster, version }) => {
    versionByPeerId.set(peerId, version)
    if (!nodeCluster) return
    roleByPeerId.set(String(nodeCluster.peer_id), nodeCluster.raft_info?.role ?? null)
  })

  return {
    ...cluster,
    peers: Object.fromEntries(
      Object.entries(cluster.peers ?? {}).map(([peerId, peer]) => [
        peerId,
        {
          ...peer,
          role: roleByPeerId.get(peerId) ?? peer.role ?? null,
          version: versionByPeerId.get(peerId) ?? peer.version ?? null,
        },
      ])
    ),
  }
}

export async function fetchCollectionNames(): Promise<string[]> {
  const result = await request<{ collections: { name: string }[] }>('/collections')
  return result.collections.map(c => c.name)
}

export async function fetchCollectionInfo(name: string): Promise<CollectionInfo> {
  return request<CollectionInfo>(`/collections/${name}`)
}

export async function fetchCollectionCluster(name: string): Promise<CollectionClusterInfo> {
  return request<CollectionClusterInfo>(`/collections/${name}/cluster`)
}

async function fetchCollectionClusterFromNode(
  name: string,
  peerUri: string
): Promise<CollectionClusterInfo> {
  const nodeBaseUrl = resolveNodeBaseUrl(peerUri)
  return requestToBaseUrl<CollectionClusterInfo>(nodeBaseUrl, `/collections/${name}/cluster`)
}

function mergeClusterPoints(
  clusterInfo: CollectionClusterInfo | null,
  nodeClusters: CollectionClusterInfo[]
): CollectionClusterInfo | null {
  if (!clusterInfo) return null

  const pointsByPeerAndShard = new Map<string, number>()

  nodeClusters.forEach(nodeCluster => {
    const peerId = String(nodeCluster.peer_id)
    nodeCluster.local_shards.forEach(shard => {
      if (shard.points_count != null) {
        pointsByPeerAndShard.set(`${peerId}:${shard.shard_id}`, shard.points_count)
      }
    })
  })

  return {
    ...clusterInfo,
    local_shards: clusterInfo.local_shards.map(shard => ({
      ...shard,
      points_count: pointsByPeerAndShard.get(`${clusterInfo.peer_id}:${shard.shard_id}`) ?? shard.points_count,
    })),
    remote_shards: clusterInfo.remote_shards.map(shard => ({
      ...shard,
      points_count: pointsByPeerAndShard.get(`${shard.peer_id}:${shard.shard_id}`) ?? shard.points_count,
    })),
  }
}

async function enrichCollectionClusterWithNodePoints(
  name: string,
  clusterInfo: CollectionClusterInfo | null,
  cluster: ClusterInfo | null
): Promise<CollectionClusterInfo | null> {
  if (!clusterInfo || !cluster) return clusterInfo

  const nodeTargets = [
    { peerId: String(cluster.peer_id), peerUri: _baseUrl },
    ...Object.entries(cluster.peers ?? {}).map(([peerId, peer]) => ({ peerId, peerUri: peer.uri })),
  ]

  const uniqueTargets = Array.from(
    new Map(nodeTargets.map(target => [target.peerId, target])).values()
  )

  const nodeClusters = await Promise.all(
    uniqueTargets.map(async ({ peerUri }) => {
      try {
        return await fetchCollectionClusterFromNode(name, peerUri)
      } catch {
        return null
      }
    })
  )

  return mergeClusterPoints(
    clusterInfo,
    nodeClusters.filter((item): item is CollectionClusterInfo => item != null)
  )
}

export async function fetchAllCollections(cluster: ClusterInfo | null = null): Promise<Collection[]> {
  const names = await fetchCollectionNames()
  const collections = await Promise.all(
    names.map(name => fetchCollection(name, cluster))
  )
  // Sort by points_count descending
  return collections.sort(
    (a, b) => (b.info?.points_count ?? -1) - (a.info?.points_count ?? -1)
  )
}

export async function fetchCollection(
  name: string,
  cluster: ClusterInfo | null = null
): Promise<Collection> {
  const [info, enrichedCluster] = await Promise.all([
    fetchCollectionInfoSafe(name),
    fetchCollectionClusterSafe(name, cluster),
  ])
  return { name, info, cluster: enrichedCluster }
}

export async function fetchCollectionInfoSafe(name: string): Promise<CollectionInfo | null> {
  return fetchCollectionInfo(name).catch(() => null)
}

export async function fetchCollectionClusterSafe(
  name: string,
  cluster: ClusterInfo | null = null
): Promise<CollectionClusterInfo | null> {
  const collectionCluster = await fetchCollectionCluster(name).catch(() => null)

  return enrichCollectionClusterWithNodePoints(name, collectionCluster, cluster)
    .catch(() => collectionCluster)
}

export async function createCollection(
  name: string,
  params: {
    size: number
    distance: string
    on_disk: boolean
    shard_number: number
    replication_factor: number
    on_disk_payload: boolean
  }
) {
  return request(`/collections/${name}`, 'PUT', {
    vectors: { size: params.size, distance: params.distance, on_disk: params.on_disk },
    shard_number: params.shard_number,
    replication_factor: params.replication_factor,
    on_disk_payload: params.on_disk_payload,
  })
}

export async function deleteCollection(name: string) {
  return request(`/collections/${name}`, 'DELETE')
}

export type ShardTransferMethod = 'stream_records' | 'snapshot' | 'wal_delta'

// Move/replicate shard — peer IDs are strings (u64), send as bare numbers via raw body
export async function moveShard(
  collName: string, shardId: number, fromPeerId: string, toPeerId: string, method: ShardTransferMethod
) {
  const body = `{"move_shard":{"shard_id":${shardId},"from_peer_id":${fromPeerId},"to_peer_id":${toPeerId},"method":"${method}"}}`
  return request(`/collections/${collName}/cluster`, 'POST', body)
}

export async function replicateShard(
  collName: string, shardId: number, fromPeerId: string, toPeerId: string, method: ShardTransferMethod
) {
  const body = `{"replicate_shard":{"shard_id":${shardId},"from_peer_id":${fromPeerId},"to_peer_id":${toPeerId},"method":"${method}"}}`
  return request(`/collections/${collName}/cluster`, 'POST', body)
}

export async function deleteShard(collName: string, shardId: number, peerId: string) {
  const body = `{"drop_replica":{"shard_id":${shardId},"peer_id":${peerId}}}`
  return request(`/collections/${collName}/cluster`, 'POST', body)
}

export async function abortShardTransfer(
  collName: string, shardId: number, fromPeerId: string, toPeerId: string
) {
  const body = `{"abort_transfer":{"shard_id":${shardId},"from_peer_id":${fromPeerId},"to_peer_id":${toPeerId}}}`
  return request(`/collections/${collName}/cluster`, 'POST', body)
}

export async function fetchSnapshots(collName: string): Promise<Snapshot[]> {
  return request<Snapshot[]>(`/collections/${collName}/snapshots`)
}

export async function createSnapshot(collName: string): Promise<Snapshot> {
  return request<Snapshot>(`/collections/${collName}/snapshots`, 'POST')
}

export async function deleteSnapshot(collName: string, snapName: string) {
  return request(`/collections/${collName}/snapshots/${snapName}`, 'DELETE')
}

export async function fetchActiveTransfers(collName: string): Promise<ShardTransfer[]> {
  const cl = await fetchCollectionCluster(collName)
  return cl.shard_transfers ?? []
}
