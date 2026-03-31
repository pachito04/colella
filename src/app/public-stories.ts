'use server'

import { prisma } from '@/lib/prisma'

export async function getPublicSuccessStories() {
  return await prisma.successStory.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  })
}

export async function getPublicReviews() {
  return await prisma.review.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  })
}
