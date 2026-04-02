'use client'

import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBRL } from '@/lib/utils'
import type { ChecklistItem, ChecklistSection } from '@/lib/types'

const SECTION_LABELS: Record<ChecklistSection, string> = {
  entradas:     'Entradas',
  contas_fixas: 'Contas Fixas',
  investimento: 'Investimento',
  parcelados:   'Parcelados',
}

const SECTION_COLORS: Record<ChecklistSection, string> = {
  entradas:     'text-emerald-400 border-emerald-800 bg-emerald-950/30',
  contas_fixas: 'text-amber-400 border-amber-800 bg-amber-950/30',
  investimento: 'text-purple-400 border-purple-800 bg-purple-950/30',
  parcelados:   'text-blue-400 border-blue-800 bg-blue-950/30',
}

const CHIP_ACTIVE: Record<ChecklistSection, string> = {
  entradas:     'bg-emerald-500/20 border-emerald-500 text-emerald-400',
  contas_fixas: 'bg-amber-500/20   border-amber-500   text-amber-400',
  investimento: 'bg-purple-500/20  border-purple-500  text-purple-400',
  parcelados:   'bg-blue-500/20    border-blue-500    text-blue-400',
}

interface Props {
  items: ChecklistItem[]
  onToggle: (id: number, checked: boolean) => void
  onValueChange: (id: number, value: number | null) => void
  onNameChange: (id: number, name: string) => void
  onAddItem: (section: ChecklistSection) => Promise<number>
  onDeleteItem: (id: number) => void
}

export function MonthlySummaryChecklist({
  items, onToggle, onValueChange, onNameChange, onAddItem, onDeleteItem,
}: Props) {
  const sections: ChecklistSection[] = ['entradas', 'contas_fixas', 'investimento', 'parcelados']
  const [activeSection, setActiveSection] = useState<ChecklistSection>('contas_fixas')
  const [editingNameId, setEditingNameId] = useState<number | null>(null)

  async function handleAdd(section: ChecklistSection) {
    const id = await onAddItem(section)
    setEditingNameId(id)
  }

  const sectionItems = items.filter((i) => i.section === activeSection)
  const colors = SECTION_COLORS[activeSection]

  // Badge counts
  const counts = Object.fromEntries(
    sections.map((s) => [s, items.filter((i) => i.section === s).length])
  ) as Record<ChecklistSection, number>

  return (
    <div className="space-y-3">
      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const isActive = s === activeSection
          return (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                isActive
                  ? CHIP_ACTIVE[s]
                  : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {SECTION_LABELS[s]}
              {counts[s] > 0 && (
                <span className={`text-[10px] font-bold rounded-full px-1 ${isActive ? 'opacity-70' : 'opacity-40'}`}>
                  {counts[s]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className={`p-3 rounded-lg border ${colors}`}>
        <div className="space-y-1.5">
          {sectionItems.length === 0 && (
            <p className="text-xs opacity-40 py-2 text-center">Nenhum item</p>
          )}
          {sectionItems.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              isEditingName={editingNameId === item.id}
              onStartEditName={() => setEditingNameId(item.id)}
              onCommitName={(name) => {
                setEditingNameId(null)
                onNameChange(item.id, name)
              }}
              onCancelEditName={() => setEditingNameId(null)}
              onToggle={onToggle}
              onValueChange={onValueChange}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}
        </div>
        <button
          onClick={() => handleAdd(activeSection)}
          className="mt-2 flex items-center gap-1 text-xs opacity-40 hover:opacity-80 transition-opacity"
        >
          <Plus size={11} />
          adicionar
        </button>
      </div>
    </div>
  )
}

function ChecklistRow({
  item,
  isEditingName,
  onStartEditName,
  onCommitName,
  onCancelEditName,
  onToggle,
  onValueChange,
  onDelete,
}: {
  item: ChecklistItem
  isEditingName: boolean
  onStartEditName: () => void
  onCommitName: (name: string) => void
  onCancelEditName: () => void
  onToggle: (id: number, checked: boolean) => void
  onValueChange: (id: number, value: number | null) => void
  onDelete: () => void
}) {
  const [optimistic, setOptimistic] = useState(item.checked === 1)
  const [editingValue, setEditingValue] = useState(false)
  const [inputVal, setInputVal] = useState(
    item.expected_value != null ? String(item.expected_value) : ''
  )
  const [nameVal, setNameVal] = useState(item.item_name)
  const valueRef = useRef<HTMLInputElement>(null)
  const nameRef  = useRef<HTMLInputElement>(null)

  if (isEditingName) {
    setTimeout(() => nameRef.current?.select(), 0)
  }

  function handleToggle(checked: boolean) {
    setOptimistic(checked)
    onToggle(item.id, checked)
  }

  function commitValue() {
    setEditingValue(false)
    const trimmed = inputVal.trim().replace(',', '.')
    const parsed  = trimmed === '' ? null : parseFloat(trimmed)
    const value   = parsed === null || isNaN(parsed) ? null : parsed
    setInputVal(value != null ? String(value) : '')
    onValueChange(item.id, value)
  }

  function commitName() {
    const name = nameVal.trim() || item.item_name
    setNameVal(name)
    onCommitName(name)
  }

  const displayValue = inputVal !== '' ? parseFloat(inputVal) : null

  return (
    <div className="flex items-center justify-between gap-1 group/row">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Checkbox
          checked={optimistic}
          onCheckedChange={(v) => handleToggle(Boolean(v))}
          className="border-current shrink-0"
        />

        {isEditingName ? (
          <input
            ref={nameRef}
            type="text"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') { setNameVal(item.item_name); onCancelEditName() }
            }}
            className="flex-1 min-w-0 text-sm bg-transparent border-b border-current outline-none"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={onStartEditName}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onStartEditName() }}
            title="Clique para editar nome"
            className={`text-sm truncate cursor-text hover:opacity-70 transition-opacity ${
              optimistic ? 'line-through opacity-50' : ''
            }`}
          >
            {item.item_name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {editingValue ? (
          <input
            ref={valueRef}
            type="text"
            inputMode="decimal"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={commitValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitValue()
              if (e.key === 'Escape') {
                setEditingValue(false)
                setInputVal(item.expected_value != null ? String(item.expected_value) : '')
              }
            }}
            className="w-20 text-right text-xs font-mono bg-transparent border-b border-current outline-none"
            placeholder="0,00"
            autoFocus
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={() => { setEditingValue(true); setTimeout(() => valueRef.current?.select(), 0) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditingValue(true) }}
            title="Clique para editar valor"
            className={`text-xs font-mono cursor-text rounded px-1 hover:bg-white/10 transition-colors ${
              displayValue != null ? 'opacity-60' : 'opacity-20 italic'
            }`}
          >
            {displayValue != null ? formatBRL(displayValue) : 'R$ —'}
          </span>
        )}

        <button
          onClick={onDelete}
          title="Remover item"
          className="opacity-0 group-hover/row:opacity-40 hover:!opacity-80 transition-opacity ml-0.5"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
