'use client'

import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'

interface UploadHistory {
  source_file: string
  first_date: string
  last_date: string
  tx_count: number
  uploaded_at: string
}

interface Props {
  onUploaded: () => void
  history: UploadHistory[]
}

export function XpUploader({ onUploaded, history }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Use um arquivo .xlsx, .xls ou .csv')
      return
    }

    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/investments/upload', { method: 'POST', body: form })
    setUploading(false)

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Erro ao processar arquivo')
      return
    }

    const data = await res.json()
    toast.success(`✓ ${data.imported} transações importadas — ${data.positions} posições atualizadas`)
    onUploaded()
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragging
            ? 'border-emerald-500 bg-emerald-950/20'
            : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-zinc-400 text-sm">Processando arquivo...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-zinc-500 mx-auto" />
            <p className="text-zinc-300 font-medium">Arraste o extrato da XP aqui</p>
            <p className="text-zinc-500 text-sm">ou clique para selecionar</p>
            <p className="text-zinc-600 text-xs mt-3">Suporta .xlsx, .xls, .csv</p>
          </div>
        )}
      </div>

      {/* Upload history */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Histórico de importações</h3>
          <div className="space-y-1.5">
            {history.map((h) => (
              <div
                key={h.source_file}
                className="flex items-center gap-3 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{h.source_file}</p>
                  <p className="text-xs text-zinc-500">{h.tx_count} transações · {h.first_date} → {h.last_date}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
