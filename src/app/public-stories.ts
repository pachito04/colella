'use server'

import { prisma } from '@/lib/prisma'

export async function getPublicSuccessStories() {
  const stories = await prisma.successStory.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: { images: { orderBy: { order: 'asc' } } }
  })
  // Shape amigable para el frontend: `images: string[]` + legacy `imageUrl`.
  return stories.map(s => ({
    id: s.id,
    name: s.name,
    role: s.role,
    description: s.description,
    imageUrl: s.imageUrl,
    images: s.images.map(i => i.url).concat(
      // Fallback: si no hay rows en StoryImage pero sí imageUrl legacy, lo usamos.
      s.images.length === 0 && s.imageUrl ? [s.imageUrl] : []
    ),
    isActive: s.isActive,
  }))
}

export async function getPublicReviews() {
  return await prisma.review.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  })
}
