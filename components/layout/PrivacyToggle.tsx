'use client'

import { Eye, EyeOff } from 'lucide-react'
import { usePrivacy } from '@/lib/privacy-context'

export function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy()

  return (
    <button
      onClick={toggle}
      title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      className="sm:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
    >
      {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  )
}
