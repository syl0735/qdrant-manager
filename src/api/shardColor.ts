// Generates a consistent HSL color for each shard ID based on total shard count.
// Colors are spread evenly across the hue wheel.

const cache = new Map<string, { hsl: string; bg: string; border: string; text: string }>()

export function getShardColor(shardId: number, totalShards: number) {
  const key = `${shardId}:${totalShards}`
  if (cache.has(key)) return cache.get(key)!

  const hue = Math.round((shardId * (360 / Math.max(totalShards, 1))) % 360)
  const result = {
    hsl: `hsl(${hue}, 70%, 62%)`,
    bg: `hsla(${hue}, 70%, 62%, 0.1)`,
    border: `hsl(${hue}, 70%, 62%)`,
    text: `hsl(${hue}, 70%, 62%)`,
  }
  cache.set(key, result)
  return result
}

export function clearShardColorCache() {
  cache.clear()
}
