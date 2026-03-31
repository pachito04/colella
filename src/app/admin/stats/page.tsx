'use client'

import { useState, useEffect } from 'react'
import { BarChart2, Save, Loader2 } from 'lucide-react'

type StatItem = {
  icon: string
  value: number
  suffix: string
  label: string
}

export default function StatsAdminPage() {
  const [stats, setStats] = useState<StatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        setStats([
          { icon: data.stat1Icon, value: data.stat1Value, suffix: data.stat1Suffix, label: data.stat1Label },
          { icon: data.stat2Icon, value: data.stat2Value, suffix: data.stat2Suffix, label: data.stat2Label },
          { icon: data.stat3Icon, value: data.stat3Value, suffix: data.stat3Suffix, label: data.stat3Label },
          { icon: data.stat4Icon, value: data.stat4Value, suffix: data.stat4Suffix, label: data.stat4Label },
        ])
        setLoading(false)
      })
  }, [])

  const handleChange = (index: number, field: keyof StatItem, value: string) => {
    setStats(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: field === 'value' ? Number(value) : value } : s
    ))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const body = {
      stat1Icon: stats[0].icon, stat1Value: stats[0].value, stat1Suffix: stats[0].suffix, stat1Label: stats[0].label,
      stat2Icon: stats[1].icon, stat2Value: stats[1].value, stat2Suffix: stats[1].suffix, stat2Label: stats[1].label,
      stat3Icon: stats[2].icon, stat3Value: stats[2].value, stat3Suffix: stats[2].suffix, stat3Label: stats[2].label,
      stat4Icon: stats[3].icon, stat4Value: stats[3].value, stat4Suffix: stats[3].suffix, stat4Label: stats[3].label,
    }
    await fetch('/api/admin/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="py-24 text-center text-gray-400">Cargando...</div>

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-gray-200 dark:border-neutral-800 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart2 className="h-6 w-6 text-teal-500" />
          <h1 className="text-4xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white">Estadísticas Web</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Los cambios se reflejan en tiempo real en la home del sitio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{stat.icon}</span>
              <p className="font-bold text-gray-900 dark:text-white text-xl">{stat.value}{stat.suffix} <span className="text-gray-400 text-sm font-normal">{stat.label}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Número</label>
                <input type="number" value={stat.value} onChange={e => handleChange(i, 'value', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sufijo</label>
                <input type="text" value={stat.suffix} onChange={e => handleChange(i, 'suffix', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50" placeholder="+ o %" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Etiqueta</label>
                <input type="text" value={stat.label} onChange={e => handleChange(i, 'label', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ícono</label>
                <input type="text" value={stat.icon} onChange={e => handleChange(i, 'icon', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50" placeholder="emoji" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <p className="text-sm text-teal-400 font-medium">✓ Cambios guardados y publicados</p>}
      </div>
    </div>
  )
}
