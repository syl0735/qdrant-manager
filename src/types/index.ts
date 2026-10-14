// All peer IDs are kept as strings to avoid JS u64 precision loss

export interface Peer {
  uri: string
  role?: string | null
  version?: string | null
}

export interface RaftInfo {
  term: number
  commit: number
  pending_operations: number
  leader: string | null
  role: string | null
  is_voter: boolean
}

export interface ClusterInfo {
  status: string
  peer_id: string
  peers: Record<string, Peer>
  raft_info?: RaftInfo
}

export interface ShardTransfer {
  shard_id: number
  from: string
  to: string
  sync: boolean
  method: string
  comment: string
}

export interface LocalShard {
  shard_id: number
  state: string
  points_count?: number
}

export interface RemoteShard {
  shard_id: number
  peer_id: string
  state: string
  points_count?: number
}

export interface CollectionClusterInfo {
  peer_id: string
  shard_number: number
  replication_factor: number
  local_shards: LocalShard[]
  remote_shards: RemoteShard[]
  shard_transfers: ShardTransfer[]
}

export interface VectorParams {
  size: number
  distance: string
  on_disk?: boolean
}

export interface CollectionConfig {
  params: {
    vectors: Record<string, VectorParams> | VectorParams
    shard_number?: number
    replication_factor?: number
    on_disk_payload?: boolean
  }
}

export interface CollectionInfo {
  status: string
  vectors_count?: number
  points_count?: number
  segments_count?: number
  disk_data_size?: number
  ram_data_size?: number
  config?: CollectionConfig
}

export interface Collection {
  name: string
  info: CollectionInfo | null
  cluster: CollectionClusterInfo | null
}

export interface Snapshot {
  name: string
  creation_time?: string
  size?: number
}

// Parsed transfer progress
export interface TransferProgress {
  comment: string
  current: number | null
  total: number | null
  pct: number | null
  eta: number | null
}
