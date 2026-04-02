'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  PAYMENT_METHODS, PAYMENT_METHOD_LABELS,
  DEFAULT_CATEGORIES,
} from '@/lib/constants'
import type { Transaction } from '@/lib/types'

const schema = z.object({
  date:            z.string().min(1, 'Data obrigatória'),
  value:           z.coerce.number().positive('Valor deve ser positivo'),
  payment_method:  z.enum(['debito_pix', 'credito', 'caju']),
  category:        z.string().min(1, 'Categoria obrigatória'),
  type:            z.enum(['entrada', 'saida', 'investimento', 'conta_fixa', 'parcelado']),
  description:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  month: string
  editing?: Transaction | null
}

export function TransactionForm({ open, onClose, onSaved, month, editing }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues, any, FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      date:           `${month}-01`,
      value:          0,
      payment_method: 'debito_pix',
      category:       '',
      type:           'saida',
      description:    '',
    },
  })

  useEffect(() => {
    if (editing) {
      form.reset({
        date:           editing.date,
        value:          editing.value,
        payment_method: editing.payment_method,
        category:       editing.category,
        type:           editing.type,
        description:    editing.description ?? '',
      })
    } else {
      form.reset({
        date:           `${month}-01`,
        value:          0,
        payment_method: 'debito_pix',
        category:       '',
        type:           'saida',
        description:    '',
      })
    }
  }, [editing, month, form])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(values: any) {
    const url    = editing ? `/api/transactions/${editing.id}` : '/api/transactions'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      toast.error('Erro ao salvar transação')
      return
    }

    toast.success(editing ? 'Transação atualizada!' : 'Transação adicionada!')
    onSaved()
    onClose()
  }

  const allCategories = DEFAULT_CATEGORIES.map((c) => c.name)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar transação' : 'Nova transação'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => {
                const isEntrada = field.value === 'entrada'
                const subtype   = ['investimento', 'conta_fixa', 'parcelado'].includes(field.value)
                  ? field.value
                  : null

                function setToggle(v: 'entrada' | 'saida') {
                  field.onChange(v)
                }

                function toggleSubtype(sub: string) {
                  field.onChange(subtype === sub ? 'saida' : sub)
                }

                return (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {/* Toggle Entrada / Saída */}
                        <div className="flex gap-2">
                          {(['entrada', 'saida'] as const).map((v) => (
                            <label
                              key={v}
                              className={`flex-1 flex items-center justify-center rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
                                (v === 'entrada' ? isEntrada : !isEntrada)
                                  ? v === 'entrada'
                                    ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300'
                                    : 'border-red-600 bg-red-900/40 text-red-300'
                                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <input
                                type="radio"
                                className="sr-only"
                                checked={v === 'entrada' ? isEntrada : !isEntrada}
                                onChange={() => setToggle(v)}
                              />
                              {v === 'entrada' ? 'Entrada' : 'Saída'}
                            </label>
                          ))}
                        </div>

                        {/* Subtypes — only for saída */}
                        {!isEntrada && (
                          <div className="flex gap-1.5 flex-wrap">
                            {([
                              ['investimento', 'Investimento', 'border-purple-700 bg-purple-900/40 text-purple-300'],
                              ['conta_fixa',   'Conta Fixa',   'border-amber-700 bg-amber-900/40 text-amber-300'],
                              ['parcelado',    'Parcelado',    'border-blue-700 bg-blue-900/40 text-blue-300'],
                            ] as const).map(([val, label, activeClass]) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => toggleSubtype(val)}
                                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                                  subtype === val
                                    ? activeClass
                                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {PAYMENT_METHODS.map((m) => (
                        <label
                          key={m}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
                            field.value === m
                              ? 'border-zinc-400 bg-zinc-700 text-zinc-100'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            value={m}
                            checked={field.value === m}
                            onChange={() => field.onChange(m)}
                          />
                          {PAYMENT_METHOD_LABELS[m]}
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Opcional..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
