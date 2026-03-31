'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getPublicReviews } from '@/app/public-stories'

type Review = {
  id: string
  author: string
  content: string
  rating: number
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    getPublicReviews().then(setReviews)
  }, [])

  return (
    <section className="relative bg-transparent py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-10 text-center text-3xl font-bold font-display text-white">
          Reviews
        </h2>

        {reviews.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
            <p className="text-sm text-neutral-300">
              Todavía no hay reviews publicadas. Podés cargarlas desde el panel de admin (CMS).
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <motion.article
                key={review.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-teal-900/40 bg-neutral-900/80 p-6"
              >
                <div className="mb-3 text-amber-300">
                  {'★'.repeat(Math.max(1, Math.min(5, review.rating)))}
                </div>

                <p className="mb-4 text-sm leading-relaxed text-gray-300">
                  “{review.content}”
                </p>

                <p className="text-sm font-bold text-teal-300">
                  — {review.author}
                </p>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
