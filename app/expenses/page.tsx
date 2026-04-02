import { Suspense } from 'react'
import { ExpensesClient } from './ExpensesClient'
import { currentMonthKey } from '@/lib/utils'

interface Props {
  searchParams: Promise<{ month?: string }>
}

export default async function ExpensesPage({ searchParams }: Props) {
  const { month } = await searchParams
  const activeMonth = month ?? currentMonthKey()

  return (
    <Suspense fallback={<div className="p-6 text-zinc-500">Carregando...</div>}>
      <ExpensesClient month={activeMonth} />
    </Suspense>
  )
}
