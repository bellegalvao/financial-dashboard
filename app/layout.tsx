import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SidebarLayout } from '@/components/layout/SidebarLayout'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finance Dashboard',
  description: 'Controle financeiro pessoal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark h-full ${inter.className}`} suppressHydrationWarning>
      <body className="h-full bg-zinc-950 text-zinc-100" suppressHydrationWarning>
        <SidebarLayout>{children}</SidebarLayout>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
