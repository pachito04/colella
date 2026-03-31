'use client'

import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  )
}
