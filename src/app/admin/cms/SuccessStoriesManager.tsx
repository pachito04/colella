'use client'

import { ChangeEvent, useState } from 'react'
import { upsertSuccessStory, deleteSuccessStory } from '../actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"

interface StoryImage {
  id: string
  url: string
  order: number
}
interface Story {
  id: string
  name: string
  role: string
  description?: string | null
  imageUrl: string | null
  images?: StoryImage[]
  isActive: boolean
}

import { Plus, Edit, Trash, Eye, EyeOff, User, Star } from 'lucide-react'

export function SuccessStoriesManager({ initialStories }: { initialStories: Story[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  
  // formData keeps an `imagesList: string[]` as the new multi-photo source of truth.
  // Legacy `imageUrl` se mantiene para retrocompatibilidad, pero a partir de ahora
  // la fuente real es imagesList[]. imageUrl = imagesList[0] si existe.
  const [formData, setFormData] = useState<Partial<Story> & { imagesList?: string[] }>({})

  const handleImageFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const maxSize = 5 * 1024 * 1024
    const invalid = files.find(f => !f.type.startsWith('image/'))
    if (invalid) {
      toast.error('Solo se permiten archivos de imagen')
      event.target.value = ''
      return
    }
    const tooBig = files.find(f => f.size > maxSize)
    if (tooBig) {
      toast.error(`"${tooBig.name}" supera 5MB`)
      event.target.value = ''
      return
    }

    Promise.all(
      files.map(f => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('read fail'))
        reader.readAsDataURL(f)
      }))
    ).then(dataUrls => {
      setFormData(prev => {
        const current = prev.imagesList ?? []
        const next = [...current, ...dataUrls]
        return { ...prev, imagesList: next, imageUrl: next[0] || prev.imageUrl }
      })
      toast.success(`${dataUrls.length} imagen${dataUrls.length > 1 ? 'es' : ''} cargada${dataUrls.length > 1 ? 's' : ''}`)
      // Reset file input so the same file could be re-picked if needed
      event.target.value = ''
    }).catch(() => toast.error('No se pudo leer alguna de las imágenes'))
  }

  const removeImageAt = (idx: number) => {
    setFormData(prev => {
      const cur = prev.imagesList ?? []
      const next = cur.filter((_, i) => i !== idx)
      return { ...prev, imagesList: next, imageUrl: next[0] || null }
    })
  }

  const moveImage = (idx: number, dir: -1 | 1) => {
    setFormData(prev => {
      const cur = [...(prev.imagesList ?? [])]
      const target = idx + dir
      if (target < 0 || target >= cur.length) return prev
      ;[cur[idx], cur[target]] = [cur[target], cur[idx]]
      return { ...prev, imagesList: cur, imageUrl: cur[0] || null }
    })
  }

  const handleEdit = (story: Story) => {
    setEditingId(story.id)
    const imgs = (story.images || []).map(i => i.url)
    const initial = imgs.length > 0 ? imgs : (story.imageUrl ? [story.imageUrl] : [])
    setFormData({ ...story, imagesList: initial })
    setIsCreating(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCreate = () => {
    setFormData({ isActive: true, imageUrl: '', imagesList: [] })
    setIsCreating(true)
    setEditingId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este caso de éxito?')) {
      await deleteSuccessStory(id)
      router.refresh()
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.role) return toast.error('Nombre y Rol son obligatorios')

    const imagesList = (formData.imagesList ?? []).filter(u => !!u)

    await upsertSuccessStory({
        id: editingId || undefined,
        name: formData.name,
        role: formData.role,
        description: formData.description || null,
        imageUrl: imagesList[0] || formData.imageUrl || undefined,
        images: imagesList,
        isActive: formData.isActive || false
    })

    setEditingId(null)
    setIsCreating(false)
    setFormData({})
    router.refresh()
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
    setFormData({})
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Create New Stuff */}
      {!isCreating && (
        <button 
            onClick={handleCreate}
            className="flex flex-col items-center justify-center min-h-[350px] border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-3xl p-8 hover:border-teal-500/50 hover:bg-teal-50/10 transition-all group"
        >
            <div className="h-16 w-16 rounded-2xl bg-gray-50 dark:bg-neutral-900 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm">
                <Plus className="h-8 w-8 text-gray-400 group-hover:text-white" />
            </div>
            <p className="font-bold text-gray-500 group-hover:text-teal-600 transition-colors">Agregar Nuevo Caso</p>
            <p className="text-xs text-gray-400 mt-2">Personaliza testimonios y fotos</p>
        </button>
      )}

      {/* Form Card (Create or Edit) */}
      {(isCreating || editingId) && (
         <div className="col-span-1 md:col-span-1 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border-2 border-teal-500 p-8 z-10 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                    <Star className="h-5 w-5 text-teal-600" />
                </div>
                <h3 className="font-black text-xl">{isCreating ? 'Nuevo Caso' : 'Editar Caso'}</h3>
            </div>
            
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nombre Completo</label>
                    <input 
                        className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-transparent outline-none transition-all dark:bg-neutral-800 dark:border-neutral-700 dark:focus:bg-neutral-900"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Ej: Lionel Messi"
                    />
                </div>
                <div>
                   <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Rol / Cargo</label>
                   <input 
                       className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-transparent outline-none transition-all dark:bg-neutral-800 dark:border-neutral-700 dark:focus:bg-neutral-900"
                       value={formData.role || ''}
                       onChange={e => setFormData({...formData, role: e.target.value})}
                       placeholder="Ej: Futbolista Profesional"
                   />
               </div>
               <div>
                   <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Descripción (Opcional)</label>
                   <textarea 
                       className="flex w-full min-h-[100px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-transparent outline-none transition-all dark:bg-neutral-800 dark:border-neutral-700 dark:focus:bg-neutral-900 resize-none"
                       value={formData.description || ''}
                       onChange={e => setFormData({...formData, description: e.target.value})}
                       placeholder="Breve reseña sobre el proceso de rehabilitación y logros..."
                   />
               </div>
               <div className="space-y-3">
                   <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Imágenes del Caso</label>
                   <input
                       type="file"
                       accept="image/*"
                       multiple
                       onChange={handleImageFilesChange}
                       className="w-full text-sm text-gray-500 dark:text-gray-300
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-xl file:border-0
                       file:text-xs file:font-black file:uppercase
                       file:bg-teal-500/10 file:text-teal-600
                       hover:file:bg-teal-500/20 cursor-pointer"
                   />
                   <p className="text-[11px] text-gray-400">Podés seleccionar varias a la vez. La primera es la portada.</p>
                   <input
                       className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-transparent outline-none transition-all dark:bg-neutral-800 dark:border-neutral-700 dark:focus:bg-neutral-900"
                       value={''}
                       onChange={e => {
                         const url = e.target.value.trim()
                         if (!url) return
                         setFormData(prev => {
                           const next = [...(prev.imagesList ?? []), url]
                           return { ...prev, imagesList: next, imageUrl: next[0] }
                         })
                         e.target.value = ''
                       }}
                       onKeyDown={e => {
                         if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
                       }}
                       placeholder="Pegá una URL y presioná Enter (opcional)"
                   />
                   {(formData.imagesList ?? []).length > 0 && (
                     <div className="grid grid-cols-3 gap-2">
                       {(formData.imagesList ?? []).map((url, idx) => (
                         <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 group">
                           <img src={url} alt={`Imagen ${idx+1}`} className="w-full h-28 object-cover" />
                           {idx === 0 && (
                             <div className="absolute top-1 left-1 bg-teal-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Portada</div>
                           )}
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center gap-1 transition-opacity">
                             <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="h-7 w-7 rounded-full bg-white/90 text-black text-sm font-bold disabled:opacity-30">←</button>
                             <button type="button" onClick={() => removeImageAt(idx)} className="h-7 w-7 rounded-full bg-rose-500 text-white text-sm font-bold">✕</button>
                             <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === (formData.imagesList?.length ?? 0) - 1} className="h-7 w-7 rounded-full bg-white/90 text-black text-sm font-bold disabled:opacity-30">→</button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
               </div>
               <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl cursor-pointer" onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                   <input 
                        type="checkbox"
                        checked={formData.isActive || false}
                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        className="h-5 w-5 rounded-lg border-gray-300 text-teal-600 focus:ring-teal-500 accent-teal-600"
                   />
                   <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Mostrar en el sitio público</label>
               </div>
               <div className="flex gap-3 pt-4">
                   <Button onClick={handleSave} className="flex-1 h-12 rounded-xl font-bold bg-teal-600 hover:bg-teal-700">Guardar Cambios</Button>
                   <Button variant="outline" onClick={handleCancel} className="flex-1 h-12 rounded-xl font-bold">Cancelar</Button>
               </div>
            </div>
         </div>
      )}

      {/* Existing Items */}
      {initialStories.map(story => {
        if (story.id === editingId) return null // Hide if editing (shown in form)
        return (
            <div key={story.id} className={`group relative bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 ${!story.isActive ? 'opacity-60 grayscale bg-gray-50' : ''}`}>
                <div className="aspect-[4/5] bg-gray-100 dark:bg-neutral-800 relative overflow-hidden">
                    {story.imageUrl ? (
                        <img src={story.imageUrl} alt={story.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                            <User className="h-12 w-12 opacity-20" />
                            <span className="text-xs font-bold uppercase tracking-widest opacity-40">Sin foto</span>
                        </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {!story.isActive ? (
                            <div className="bg-black/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-2">
                                <EyeOff className="h-3 w-3" /> Inactivo
                            </div>
                        ) : (
                           <div className="bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                               <Eye className="h-3 w-3" /> Activo
                           </div>
                        )}
                    </div>
                </div>
                <div className="p-8 flex-1">
                    <h3 className="font-extrabold text-2xl text-gray-900 dark:text-white leading-tight mb-1">{story.name}</h3>
                    <p className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">{story.role}</p>
                </div>
                <div className="p-6 pt-0 flex gap-3">
                    <Button size="sm" variant="outline" className="flex-1 h-11 rounded-1.5xl font-bold border-gray-200" onClick={() => handleEdit(story)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-11 w-11 rounded-1.5xl flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(story.id)}>
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
      })}
    </div>
  )
}

