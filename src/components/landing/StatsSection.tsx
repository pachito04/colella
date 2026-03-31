import { prisma } from '@/lib/prisma'

async function getSiteStats() {
  let stats = await prisma.siteStats.findUnique({ where: { id: 'stats' } })
  if (!stats) {
    stats = await prisma.siteStats.create({
      data: { id: 'stats' }
    })
  }
  return stats
}

export async function StatsSection() {
  const stats = await getSiteStats()

  const items = [
    { icon: stats.stat1Icon, value: stats.stat1Value, suffix: stats.stat1Suffix, label: stats.stat1Label },
    { icon: stats.stat2Icon, value: stats.stat2Value, suffix: stats.stat2Suffix, label: stats.stat2Label },
    { icon: stats.stat3Icon, value: stats.stat3Value, suffix: stats.stat3Suffix, label: stats.stat3Label },
    { icon: stats.stat4Icon, value: stats.stat4Value, suffix: stats.stat4Suffix, label: stats.stat4Label },
  ]

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-teal-950/30 border border-teal-500/10 backdrop-blur-sm"
          >
            <span className="text-3xl mb-3">{stat.icon}</span>
            <p className="text-3xl md:text-4xl font-black text-white">
              {stat.value}<span className="text-teal-400">{stat.suffix}</span>
            </p>
            <p className="text-sm text-gray-400 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
