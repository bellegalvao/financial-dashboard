import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SidebarLayout } from '@/components/layout/SidebarLayout'
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar'
import { Toaster } from '@/components/ui/sonner'
import { PrivacyProvider } from '@/lib/privacy-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finance Dashboard',
  description: 'Controle financeiro pessoal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finanças',
  },
  icons: {
    apple: '/apple-icon-180.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark h-full ${inter.className}`} suppressHydrationWarning>
      <body className="h-full bg-zinc-950 text-zinc-100" suppressHydrationWarning>
        <PrivacyProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </PrivacyProvider>
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
