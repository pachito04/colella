import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined')
  }

  // 1. Upsert Global Settings
  const settings = await prisma.globalSettings.upsert({
    where: { id: 'settings' },
    update: {},
    create: {
      id: 'settings',
      currentPrice: 30000,
      sessionDuration: 30,
      depositPercentage: 50,
    },
  })
  console.log('Created/Updated Global Settings:', settings)

  // 2. Initialize Work Schedule (Default Kinesiologist hours)
  // Mon, Tue, Fri: 13-20 | Wed, Thu: 8-14 | Sat, Sun: Closed
  const schedules = [
      { day: 1, start: '13:00', end: '20:00', active: true },
      { day: 2, start: '13:00', end: '20:00', active: true },
      { day: 3, start: '08:00', end: '14:00', active: true },
      { day: 4, start: '08:00', end: '14:00', active: true },
      { day: 5, start: '13:00', end: '20:00', active: true },
      { day: 6, start: '09:00', end: '13:00', active: false }, // Closed by default
      { day: 0, start: '09:00', end: '13:00', active: false }, // Closed
  ]

  for (const s of schedules) {
      await prisma.workSchedule.upsert({
          where: { dayOfWeek: s.day },
          update: {},
          create: {
              dayOfWeek: s.day,
              startTime: s.start,
              endTime: s.end,
              isActive: s.active
          }
      })
  }
  console.log('Initialized Work Schedule')

  // 3. Create Sample Success Story (Inactive by default)
  const existingStory = await prisma.successStory.findFirst()
  if (!existingStory) {
      await prisma.successStory.create({
          data: {
              name: 'Lionel Messi',
              role: 'Fútbol Profesional',
              imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg',
              isActive: false // Hidden by default so it doesn't leak to prod if not wanted
          }
      })
      console.log('Created Sample Success Story')
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
