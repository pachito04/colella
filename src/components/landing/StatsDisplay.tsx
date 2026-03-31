'use client'

import { useEffect, useRef, useState } from 'react'

type Stat = { icon: string; value: number; suffix: string; label: string }

function AnimatedNumber({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{count}</span>
}

export function StatsDisplay({ stats }: { stats: Stat[] }) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-teal-950/30 border border-teal-500/10 backdrop-blur-sm"
          >
            <span className="text-3xl mb-3">{stat.icon}</span>
            <p className="text-3xl md:text-4xl font-black text-white">
              <AnimatedNumber target={stat.value} />
              <span className="text-teal-400">{stat.suffix}</span>
            </p>
            <p className="text-sm text-gray-400 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
