'use client'

import { useEffect, useState } from 'react'
import { XpUploader } from '@/components/investments/XpUploader'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface UploadHistory {
  source_file: string
  first_date: string
  last_date: string
  tx_count: number
  uploaded_at: string
}

export default function UploadPage() {
  const [history, setHistory] = useState<UploadHistory[]>([])

  async function fetchHistory() {
    const res = await fetch('/api/investments/upload')
    if (res.ok) setHistory(await res.json())
  }

  useEffect(() => { fetchHistory() }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/investments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Importar Extrato XP</h1>
          <p className="text-zinc-500 text-sm">Faça upload do arquivo Excel ou CSV exportado da XP Investimentos</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <XpUploader onUploaded={fetchHistory} history={history} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">Como exportar o extrato da XP</h2>
        <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
          <li>Acesse o site da XP Investimentos ou o app</li>
          <li>Vá em <strong className="text-zinc-300">Extrato → Movimentações</strong></li>
          <li>Selecione o período desejado</li>
          <li>Clique em <strong className="text-zinc-300">Exportar</strong> e escolha Excel (.xlsx) ou CSV</li>
          <li>Faça o upload do arquivo aqui</li>
        </ol>
      </div>
    </div>
  )
}
