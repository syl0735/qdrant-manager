import { useState } from 'react'
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Select, SelectItem, Switch,
} from '@heroui/react'
import { createCollection } from '@/api/client'
import { addToast } from '@heroui/react'

interface CreateCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateCollectionModal({ isOpen, onClose, onCreated }: CreateCollectionModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', size: '1536', distance: 'Cosine',
    shards: '1', replicas: '1', onDisk: false, payloadOnDisk: false,
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.name.trim()) { addToast({ title: '请输入名称', color: 'warning' }); return }
    setLoading(true)
    try {
      await createCollection(form.name.trim(), {
        size: parseInt(form.size),
        distance: form.distance,
        on_disk: form.onDisk,
        shard_number: parseInt(form.shards),
        replication_factor: parseInt(form.replicas),
        on_disk_payload: form.payloadOnDisk,
      })
      addToast({ title: `Collection "${form.name}" 已创建`, color: 'success' })
      onCreated()
      onClose()
    } catch (e) {
      addToast({ title: '创建失败', description: (e as Error).message, color: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader>新建 Collection</ModalHeader>
        <ModalBody className="gap-4">
          <Input label="名称" placeholder="my_collection" value={form.name} onValueChange={v => set('name', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="向量维度" type="number" value={form.size} onValueChange={v => set('size', v)} min={1} />
            <Select label="距离函数" selectedKeys={[form.distance]} onSelectionChange={k => set('distance', [...k][0] as string)}>
              {['Cosine','Dot','Euclid','Manhattan'].map(d => <SelectItem key={d}>{d}</SelectItem>)}
            </Select>
            <Input label="Shard 数" type="number" value={form.shards} onValueChange={v => set('shards', v)} min={1} />
            <Input label="副本因子" type="number" value={form.replicas} onValueChange={v => set('replicas', v)} min={1} />
          </div>
          <div className="flex gap-4">
            <Switch size="sm" isSelected={form.onDisk} onValueChange={v => set('onDisk', v)}>向量存磁盘</Switch>
            <Switch size="sm" isSelected={form.payloadOnDisk} onValueChange={v => set('payloadOnDisk', v)}>Payload 存磁盘</Switch>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>取消</Button>
          <Button color="warning" onPress={handleCreate} isLoading={loading}>创建</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
