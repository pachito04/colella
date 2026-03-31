import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        // @ts-expect-error - Custom fields from Prisma schema
        session.user.role = user.role
        // @ts-expect-error - Custom fields from Prisma schema
        session.user.phoneNumber = user.phoneNumber
      }
      return session
    },
  },
})
