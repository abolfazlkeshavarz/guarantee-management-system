"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useCalendar } from "@/contexts/CalendarContext"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface JalaliCalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  defaultMonth?: Date
  disabled?: boolean
  className?: string
  /** First selectable year in the year dropdown (default 1398) */
  startYear?: number
}

const WEEKDAYS_FA = ["ش", "ی", "د¯", "س", "چ", "پ", "ج"]

export function JalaliCalendar({
  selected,
  onSelect,
  defaultMonth,
  disabled,
  className,
  startYear = 1398,
}: JalaliCalendarProps) {
  const {
    toJalali,
    toGregorian,
    getDaysInJalaliMonth,
    getJalaliFirstDayOfMonth,
    getJalaliMonths,
  } = useCalendar()

  const initial = React.useMemo(
    () => toJalali(selected ?? defaultMonth ?? new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [viewYear, setViewYear] = React.useState(initial.year)
  const [viewMonth, setViewMonth] = React.useState(initial.month)

  // Keep the view in sync if `selected` changes from outside (e.g. typed input)
  React.useEffect(() => {
    if (selected) {
      const j = toJalali(selected)
      setViewYear(j.year)
      setViewMonth(j.month)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.getTime()])

  const todayJalali = toJalali(new Date())
  const selectedJalali = selected ? toJalali(selected) : null

  const months = getJalaliMonths()
  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth)
  const firstDayOffset = getJalaliFirstDayOfMonth(viewYear, viewMonth)

  // Years from startYear through the current Jalali year.
  // If the currently viewed/selected year falls outside that range
  // (e.g. old data), extend the list so it still shows correctly.
  const years = React.useMemo(() => {
    const currentYear = todayJalali.year
    const rangeStart = Math.min(startYear, viewYear)
    const rangeEnd = Math.max(currentYear, viewYear)
    const arr: number[] = []
    for (let y = rangeStart; y <= rangeEnd; y++) arr.push(y)
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startYear, viewYear, todayJalali.year])

  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleDayClick = (day: number) => {
    if (disabled) return
    const gregorianDate = toGregorian({ year: viewYear, month: viewMonth, day })
    onSelect?.(gregorianDate)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div data-slot="jalali-calendar" className={cn("bg-background p-2 w-[272px]", className)}>
      <div className="flex items-center justify-between gap-1 px-1 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={goToPrevMonth}
          disabled={disabled}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          <Select
            items={months.map((m) => ({ value: String(m.number), label: m.name }))}
            value={String(viewMonth)}
            onValueChange={(value) => setViewMonth(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger size="sm" className="h-7 w-[96px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="w-[110px] min-w-[110px] max-h-[220px]"
            >
              {months.map((m) => (
                <SelectItem key={m.number} value={String(m.number)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(viewYear)}
            onValueChange={(value) => setViewYear(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger size="sm" className="h-7 w-[76px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="w-[80px] min-w-[80px] max-h-[220px]"
            >
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={goToNextMonth}
          disabled={disabled}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_FA.map((w, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-[0.8rem] font-normal text-muted-foreground h-7"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} className="h-7 w-7" />

          const isSelected =
            selectedJalali &&
            selectedJalali.year === viewYear &&
            selectedJalali.month === viewMonth &&
            selectedJalali.day === day

          const isToday =
            todayJalali.year === viewYear &&
            todayJalali.month === viewMonth &&
            todayJalali.day === day

          return (
            <button
              type="button"
              key={idx}
              disabled={disabled}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-7 w-7 rounded-md text-sm font-normal transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
                isToday && !isSelected && "bg-muted text-foreground",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}