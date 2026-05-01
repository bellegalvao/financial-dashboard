'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, TrendingUp, ChevronLeft, ChevronRight, Eye, EyeOff, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrivacy } from '@/lib/privacy-context'

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/expenses',    label: 'Gastos',        icon: CreditCard },
  { href: '/investments', label: 'Investimentos', icon: TrendingUp },
]

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const { hidden, toggle: togglePrivacy } = usePrivacy()

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
    setMounted(true)

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — desktop only */}
      <aside
        className={cn(
          'hidden md:flex fixed left-0 top-0 h-screen bg-zinc-900 border-r border-zinc-800 flex-col z-40 transition-all duration-200',
          mounted && collapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'border-b border-zinc-800 flex items-center',
          collapsed ? 'h-16 justify-center px-0' : 'px-5 py-6'
        )}>
          {collapsed ? (
            <span className="text-xl">💰</span>
          ) : (
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">💰 Finance</h1>
              <p className="text-zinc-400 text-xs mt-0.5">Controle pessoal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={cn('flex-1 py-4 space-y-1', collapsed ? 'px-2' : 'px-3')}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = mounted && pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          'border-t border-zinc-800 flex items-center',
          collapsed ? 'py-4 justify-center' : 'px-5 py-4 justify-between'
        )}>
          {!collapsed && <p className="text-zinc-500 text-xs truncate">Isabelle Galvão</p>}
          <div className="flex items-center gap-1 shrink-0">
            {installPrompt && (
              <button
                onClick={handleInstall}
                title="Instalar app"
                className="p-1 rounded text-emerald-500 hover:text-emerald-300 hover:bg-zinc-800 transition-colors"
              >
                <Download size={14} />
              </button>
            )}
            <button
              onClick={togglePrivacy}
              title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={toggle}
              title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main
        className={cn(
          'flex-1 min-h-screen overflow-x-hidden transition-all duration-200 pb-20 md:pb-0',
          mounted && collapsed ? 'md:ml-14' : 'md:ml-56'
        )}
      >
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 flex">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors',
                active ? 'text-emerald-400' : 'text-zinc-500'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-emerald-400')} />
              <span>{label}</span>
            </Link>
          )
        })}
        {installPrompt && (
          <button
            onClick={handleInstall}
            className="flex flex-col items-center justify-center gap-1 py-3 px-3 text-xs font-medium text-emerald-400 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>Instalar</span>
          </button>
        )}
      </nav>

    </div>
  )
}
