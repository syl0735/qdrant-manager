export async function requestNotificationPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') return
  await Notification.requestPermission()
}

export function notifyShardTransferComplete(collName: string, shardId: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  new Notification('Shard 迁移完成', {
    body: `Collection ${collName}：Shard ${shardId} 已完成迁移。`,
    tag: `shard-transfer-${collName}-${shardId}`,
  })
}
