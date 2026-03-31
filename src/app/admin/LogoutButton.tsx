'use client'

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton({ isMobile }: { isMobile?: boolean }) {
  if (isMobile) {
    return (
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => signOut()}
        className="text-white hover:bg-white/10"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button 
      variant="ghost" 
      onClick={() => signOut()}
      className="w-full justify-start text-teal-100/60 hover:text-white hover:bg-white/5 py-5 rounded-xl text-xs"
    >
      <LogOut className="mr-3 h-4 w-4 opacity-50" />
      Cerrar Sesión
    </Button>
  )
}

