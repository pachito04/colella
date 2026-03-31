'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deleteReview, upsertReview } from '../actions'

type Review = {
  id: string
  author: string
  content: string
  rating: number
  isActive: boolean
}

export function ReviewsManager({ initialReviews }: { initialReviews: Review[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Review>>({ isActive: true, rating: 5 })

  const onSave = async () => {
    if (!formData.author || !formData.content) return
    await upsertReview({
      id: editingId || undefined,
      author: formData.author,
      content: formData.content,
      rating: Number(formData.rating || 5),
      isActive: !!formData.isActive,
    })
    setEditingId(null)
    setFormData({ isActive: true, rating: 5 })
    router.refresh()
  }

  return (
    <div className="space-y-4 rounded-3xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
      <h2 className="text-2xl font-bold">Reviews</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="h-11 rounded-xl border px-3 bg-transparent" placeholder="Autor" value={formData.author || ''} onChange={e => setFormData({ ...formData, author: e.target.value })} />
        <input className="h-11 rounded-xl border px-3 bg-transparent" type="number" min={1} max={5} placeholder="Rating 1-5" value={formData.rating || 5} onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })} />
      </div>
      <textarea className="w-full rounded-xl border px-3 py-2 min-h-24 bg-transparent" placeholder="Review" value={formData.content || ''} onChange={e => setFormData({ ...formData, content: e.target.value })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
        Activo
      </label>
      <div className="flex gap-2">
        <Button onClick={onSave}>{editingId ? 'Actualizar' : 'Crear'} review</Button>
        {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setFormData({ isActive: true, rating: 5 }) }}>Cancelar</Button>}
      </div>

      <div className="space-y-2 pt-4">
        {initialReviews.map(review => (
          <div key={review.id} className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="font-semibold">{review.author} · {review.rating}★</p>
              <p className="text-sm text-gray-500">{review.content}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditingId(review.id); setFormData(review) }}>Editar</Button>
              <Button size="sm" variant="destructive" onClick={async () => { await deleteReview(review.id); router.refresh() }}>Eliminar</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
