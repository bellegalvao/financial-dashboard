'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { TransactionForm } from './TransactionForm'
import { formatBRL } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { Transaction, TransactionType } from '@/lib/types'

const SUBTYPE_LABELS: Partial<Record<TransactionType, string>> = {
  investimento: 'Investimento',
  conta_fixa:   'Conta Fixa',
  parcelado:    'Parcelado',
}

const SUBTYPE_COLORS: Partial<Record<TransactionType, string>> = {
  investimento: 'border-purple-700 bg-purple-900/30 text-purple-300',
  conta_fixa:   'border-amber-700 bg-amber-900/30 text-amber-300',
  parcelado:    'border-blue-700 bg-blue-900/30 text-blue-300',
}

interface Props {
  transactions: Transaction[]
  month: string
  onRefresh: () => void
}

export function TransactionTable({ transactions, month, onRefresh }: Props) {
  const [formOpen,  setFormOpen]  = useState(false)
  const [editing,   setEditing]   = useState<Transaction | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = typeFilter === 'all'
    ? transactions
    : typeFilter === 'saida'
      ? transactions.filter((t) => t.type !== 'entrada')
      : transactions.filter((t) => t.type === typeFilter)

  async function handleDelete(id: number) {
    if (!confirm('Excluir esta transação?')) return
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Transação excluída')
      onRefresh()
    } else {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
            <SelectItem value="investimento">↳ Investimento</SelectItem>
            <SelectItem value="conta_fixa">↳ Conta Fixa</SelectItem>
            <SelectItem value="parcelado">↳ Parcelado</SelectItem>
          </SelectContent>
        </Select>

        <div className="hidden sm:block">
          <Button
            size="sm"
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 w-24">Data</TableHead>
              <TableHead className="text-zinc-400">Categoria</TableHead>
              <TableHead className="text-zinc-400">Tipo</TableHead>
              <TableHead className="text-zinc-400">Pagamento</TableHead>
              <TableHead className="text-zinc-400 text-right">Valor</TableHead>
              <TableHead className="text-zinc-400 w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tx) => (
                <TableRow key={tx.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell className="text-zinc-400 text-sm">
                    {tx.date.slice(5).replace('-', '/')}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{tx.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${tx.type === 'entrada' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'}`}
                      >
                        {tx.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                      {SUBTYPE_LABELS[tx.type as TransactionType] && (
                        <span className={`rounded-full border px-2 py-px text-[10px] leading-none ${SUBTYPE_COLORS[tx.type as TransactionType]}`}>
                          {SUBTYPE_LABELS[tx.type as TransactionType]}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {PAYMENT_METHOD_LABELS[tx.payment_method as keyof typeof PAYMENT_METHOD_LABELS]}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-semibold text-sm ${
                    tx.type === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'entrada' ? '+' : '-'}{formatBRL(tx.value)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditing(tx); setFormOpen(true) }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSaved={onRefresh}
        month={month}
        editing={editing}
      />
    </div>
  )
}
