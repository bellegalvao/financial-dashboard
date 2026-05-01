'use client'

import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AssetType } from '@/lib/types'

interface UploadHistory {
  source_file: string
  first_date: string
  last_date: string
  tx_count: number
  uploaded_at: string
}

type TickerStatus = 'added' | 'updated' | 'removed'

interface TickerResult {
  ticker: string
  asset_type: AssetType
  status: TickerStatus
}

interface UploadResult {
  imported: number
  positions: number
  dividends?: number
  filename: string
  format: 'posicao_detalhada' | 'transacoes'
  month?: string | null
  tickers: TickerResult[]
}

interface Props {
  onUploaded: () => void
  history: UploadHistory[]
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  acoes:              'Ações',
  fii:                'FII',
  renda_fixa:         'Renda Fixa',
  fundo_investimento: 'Fundo',
  cripto:             'Cripto',
  dolar:              'Dólar',
}

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  acoes:              'bg-blue-500/15 text-blue-400 border-blue-700/50',
  fii:                'bg-emerald-500/15 text-emerald-400 border-emerald-700/50',
  renda_fixa:         'bg-amber-500/15 text-amber-400 border-amber-700/50',
  fundo_investimento: 'bg-purple-500/15 text-purple-400 border-purple-700/50',
  cripto:             'bg-orange-500/15 text-orange-400 border-orange-700/50',
  dolar:              'bg-cyan-500/15 text-cyan-400 border-cyan-700/50',
}

const STATUS_CONFIG: Record<TickerStatus, { label: string; ring: string; dot: string }> = {
  added:   { label: 'Adicionado',  ring: 'ring-1 ring-emerald-600/60', dot: 'bg-emerald-400' },
  updated: { label: 'Atualizado',  ring: '',                           dot: 'bg-zinc-500'    },
  removed: { label: 'Removido',    ring: 'ring-1 ring-red-600/60',     dot: 'bg-red-400'     },
}

export function XpUploader({ onUploaded, history }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState<UploadResult | null>(null)

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Use um arquivo .xlsx, .xls ou .csv')
      return
    }

    setUploading(true)
    setResult(null)
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/investments/upload', { method: 'POST', body: form })
    setUploading(false)

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Erro ao processar arquivo')
      return
    }

    const data: UploadResult = await res.json()
    setResult(data)
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

      {/* Resultado da importação */}
      {result && (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-300">
                  {result.format === 'posicao_detalhada'
                    ? `${result.positions} posições atualizadas`
                    : `${result.imported} transações importadas · ${result.positions} posições recalculadas`}
                </p>
                <p className="text-xs text-zinc-500">{result.filename}</p>
              </div>
            </div>
            <button onClick={() => setResult(null)} className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {result.tickers.length > 0 && (
            <div className="space-y-3">
              {(['added', 'updated', 'removed'] as TickerStatus[]).map((status) => {
                const group = result.tickers.filter((t) => t.status === status)
                if (group.length === 0) return null
                const cfg = STATUS_CONFIG[status]
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      <p className="text-xs text-zinc-500 font-medium">
                        {cfg.label} ({group.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.map((t) => (
                        <span
                          key={t.ticker}
                          title={ASSET_TYPE_LABELS[t.asset_type]}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-mono font-medium ${ASSET_TYPE_COLORS[t.asset_type]} ${cfg.ring}`}
                        >
                          {t.ticker}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Legenda das cores de tipo */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-zinc-800/60">
                {([...new Set(result.tickers.map((t) => t.asset_type))] as AssetType[]).map((type) => (
                  <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className={`inline-block h-2 w-2 rounded-full border ${ASSET_TYPE_COLORS[type]}`} />
                    {ASSET_TYPE_LABELS[type]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico de importações */}
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
