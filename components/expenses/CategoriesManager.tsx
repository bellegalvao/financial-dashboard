'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Category, CategoryType } from '@/lib/types'

const TYPE_LABELS: Record<CategoryType, string> = {
  expense:    'Despesa',
  income:     'Receita',
  investment: 'Investimento',
}

const TYPE_COLORS: Record<CategoryType, string> = {
  expense:    'text-red-400',
  income:     'text-emerald-400',
  investment: 'text-blue-400',
}

interface Props {
  month: string
}

interface CategoryWithBudget extends Category {
  budget: number
}

const TYPE_FILTER_LABELS: Record<CategoryType | 'all', string> = {
  all:        'Todos',
  expense:    'Despesas',
  income:     'Receitas',
  investment: 'Investimentos',
}

const TYPE_FILTER_ACTIVE: Record<CategoryType | 'all', string> = {
  all:        'bg-zinc-700 border-zinc-500 text-zinc-100',
  expense:    'bg-red-500/20 border-red-500 text-red-400',
  income:     'bg-emerald-500/20 border-emerald-500 text-emerald-400',
  investment: 'bg-blue-500/20 border-blue-500 text-blue-400',
}

export function CategoriesManager({ month }: Props) {
  const [categories, setCategories] = useState<CategoryWithBudget[]>([])
  const [loading,    setLoading]    = useState(true)
  const [typeFilter, setTypeFilter] = useState<CategoryType | 'all'>('all')

  // inline edit state
  const [editingId,    setEditingId]    = useState<number | null>(null)
  const [editName,     setEditName]     = useState('')
  const [editType,     setEditType]     = useState<CategoryType>('expense')
  const [editColor,    setEditColor]    = useState('')
  const [editBudget,   setEditBudget]   = useState('')

  // new category form
  const [showNew,    setShowNew]    = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newType,    setNewType]    = useState<CategoryType>('expense')
  const [newColor,   setNewColor]   = useState('#6366f1')
  const [newBudget,  setNewBudget]  = useState('')
  const [saving,     setSaving]     = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/categories?month=${month}`)
    const data = await res.json()
    setCategories(data)
    setLoading(false)
  }, [month])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  function startEdit(cat: CategoryWithBudget) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditType(cat.type)
    setEditColor(cat.color ?? '#6366f1')
    setEditBudget(cat.budget > 0 ? String(cat.budget) : '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(cat: CategoryWithBudget) {
    setSaving(true)
    await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, name: editName, type: editType, color: editColor }),
    })
    const budget = parseFloat(editBudget)
    if (!isNaN(budget)) {
      await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editName, month, budget }),
      })
    }
    setEditingId(null)
    setSaving(false)
    fetchCategories()
  }

  async function deleteCategory(id: number) {
    await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchCategories()
  }

  async function createCategory() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), type: newType, color: newColor }),
    })
    const created = await res.json()
    const budget = parseFloat(newBudget)
    if (!isNaN(budget) && budget > 0) {
      await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: created.name, month, budget }),
      })
    }
    setShowNew(false)
    setNewName('')
    setNewType('expense')
    setNewColor('#6366f1')
    setNewBudget('')
    setSaving(false)
    fetchCategories()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-zinc-500">Carregando...</div>
  }

  const filtered = typeFilter === 'all'
    ? categories
    : categories.filter((c) => c.type === typeFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'expense', 'income', 'investment'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                typeFilter === t
                  ? TYPE_FILTER_ACTIVE[t]
                  : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {TYPE_FILTER_LABELS[t]}
              {t !== 'all' && (
                <span className="ml-1.5 opacity-50">
                  {categories.filter((c) => c.type === t).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {/* New category row */}
      {showNew && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-32">
            <label className="text-xs text-zinc-400">Nome</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nome da categoria"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 w-36">
            <label className="text-xs text-zinc-400">Tipo</label>
            <Select value={newType} onValueChange={v => setNewType(v as CategoryType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="investment">Investimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-28">
            <label className="text-xs text-zinc-400">Previsão (R$)</label>
            <Input
              value={newBudget}
              onChange={e => setNewBudget(e.target.value)}
              placeholder="0,00"
              type="number"
              min="0"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Cor</label>
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="h-8 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
            />
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={createCategory} disabled={saving || !newName.trim()}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cor</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tipo</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Previsão</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((cat, i) => (
              <tr
                key={cat.id}
                className={`border-b border-zinc-800/50 ${i % 2 === 0 ? 'bg-zinc-900/20' : ''}`}
              >
                {editingId === cat.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={e => setEditColor(e.target.value)}
                        className="h-7 w-8 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-7 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select value={editType} onValueChange={v => setEditType(v as CategoryType)}>
                        <SelectTrigger className="h-7 text-sm w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Despesa</SelectItem>
                          <SelectItem value="income">Receita</SelectItem>
                          <SelectItem value="investment">Investimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={editBudget}
                        onChange={e => setEditBudget(e.target.value)}
                        placeholder="0,00"
                        type="number"
                        min="0"
                        className="h-7 text-sm text-right w-28 ml-auto"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => saveEdit(cat)}
                          disabled={saving}
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 rounded text-zinc-400 hover:bg-zinc-700 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-zinc-700"
                        style={{ backgroundColor: cat.color ?? '#6366f1' }}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-zinc-100 font-medium">{cat.name}</td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${TYPE_COLORS[cat.type]}`}>
                      {TYPE_LABELS[cat.type]}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-300 text-xs">
                      {cat.budget > 0
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.budget)
                        : <span className="text-zinc-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
