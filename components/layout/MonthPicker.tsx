'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { monthLabel, prevMonthKey, nextMonthKey, currentMonthKey } from '@/lib/utils'

interface MonthPickerProps {
  value: string  // 'YYYY-MM'
}

export function MonthPicker({ value }: MonthPickerProps) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()
  const isCurrentMonth = value === currentMonthKey()

  function navigate(monthKey: string) {
    const sp = new URLSearchParams(params.toString())
    sp.set('month', monthKey)
    router.push(`${pathname}?${sp.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(prevMonthKey(value))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm font-semibold text-foreground min-w-[72px] text-center">
        {monthLabel(value)}
      </span>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(nextMonthKey(value))}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
