'use client'

import { useState } from 'react'
import { BarChart2, Save } from 'lucide-react'
import { updateSiteStats } from './actions'

type Stats = {
  stat1Value: number; stat1Suffix: string; stat1Label: string; stat1Icon: string
  stat2Value: number; stat2Suffix: string; stat2Label: string; stat2Icon: string
  stat3Value: number; stat3Suffix: string; stat3Label: string; stat3Icon: string
  stat4Value: number; stat4Suffix: string; stat4Label: string; stat4Icon: string
}

export function StatsEditor({ stats }: { stats: Stats }) {
  const [form, setForm] = useState([
    { icon: stats.stat1Icon, value: stats.stat1Value, suffix: stats.stat1Suffix, label: stats.stat1Label },
    { icon: stats.stat2Icon, value: stats.stat2Value, suffix: stats.stat2Suffix, label: stats.stat2Label },
    { icon: stats.stat3Icon, value: stats.stat3Value, suffix: stats.stat3Suffix, label: stats.stat3Label },
    { icon: stats.stat4Icon, value: stats.stat4Value, suffix: stats.stat4Suffix, label: stats.stat4Label },
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (index: number, field: string, value: string) => {
    setForm(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: field === 'value' ? Number(value) : value } : s
    ))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await updateSiteStats({
      stat1Value: form[0].value, stat1Suffix: form[0].suffix, stat1Label: form[0].label, stat1Icon: form[0].icon,
      stat2Value: form[1].value, stat2Suffix: form[1].suffix, stat2Label: form[1].label, stat2Icon: form[1].icon,
      stat3Value: form[2].value, stat3Suffix: form[2].suffix, stat3Label: form[2].label, stat3Icon: form[2].icon,
      stat4Value: form[3].value, stat4Suffix: form[3].suffix, stat4Label: form[3].label, stat4Icon: form[3].icon,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-gray-200 dark:border-neutral-800 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart2 className="h-6 w-6 text-teal-500" />
          <h1 className="text-4xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white">Estadísticas Web</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Los cambios se reflejan en la home inmediatamente.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {form.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{stat.icon}</span>
              <p className="font-bold text-gray-900 dark:text-white text-lg">
                {stat.value}{stat.suffix} <span className="text-gray-400 font-normal text-sm">{stat.label}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ícono</label>
                <input
                  type="text"
                  value={stat.icon}
                  onChange={e => handleChange(i, 'icon', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Número</label>
                <input
                  type="number"
                  value={stat.value}
                  onChange={e => handleChange(i, 'value', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sufijo</label>
                <input
                  type="text"
                  value={stat.suffix}
                  onChange={e => handleChange(i, 'suffix', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50"
                  placeholder="+ o %"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Etiqueta</label>
                <input
                  type="text"
                  value={stat.label}
                  onChange={e => handleChange(i, 'label', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-teal-500/50"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <p className="text-sm text-teal-400 font-medium">✓ Guardado — la home ya muestra los nuevos números</p>}
      </div>
    </div>
  )
}
