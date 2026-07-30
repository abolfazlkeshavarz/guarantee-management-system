"use client"

import * as React from "react"
import { useCalendar } from "@/contexts/CalendarContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { JalaliCalendar } from "@/components/ui/jalali-calendar"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

// The `value` prop always comes from the backend as a plain Gregorian
// YYYY-MM-DD string, regardless of the active calendar display mode.
// This must NEVER be interpreted as Jalali, unlike user-typed input.
function parseBackendDate(value: string): Date | null {
  if (!value) return null
  const parts = value.split('-')
  if (parts.length === 3) {
    const y = Number(parts[0])
    const m = Number(parts[1])
    const d = Number(parts[2])
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      return new Date(Date.UTC(y, m - 1, d))
    }
  }
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder, 
  disabled, 
  className, 
  required 
}: DatePickerProps) {
  const { 
    calendarType, 
    formatDate,
    formatDateForBackend,
    parseDate,
  } = useCalendar()
  
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [inputValue, setInputValue] = React.useState('')

  // Update when the backend value changes, or when the display calendar
  // is toggled (so the field re-formats without changing the underlying date)
  React.useEffect(() => {
    if (value) {
      const date = parseBackendDate(value)
      if (date && !isNaN(date.getTime())) {
        setSelectedDate(date)
        setInputValue(formatDate(date, 'YYYY-MM-DD'))
      }
    } else {
      setSelectedDate(undefined)
      setInputValue('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, calendarType])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setInputValue(formatDate(date, 'YYYY-MM-DD'))
      onChange?.(formatDateForBackend(date))
    } else {
      setSelectedDate(undefined)
      setInputValue('')
      onChange?.('')
    }
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    // Here, unlike the backend value, the user is typing in whatever
    // calendar is currently active — so calendar-aware parsing is correct.
    const parsed = parseDate(val)
    if (parsed) {
      setSelectedDate(parsed)
      onChange?.(formatDateForBackend(parsed))
    }
  }

  const handleClear = () => {
    setSelectedDate(undefined)
    setInputValue('')
    onChange?.('')
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder ?? 'YYYY-MM-DD'}
          disabled={disabled}
          className="pr-24"
          required={required}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-7 w-7"
                  disabled={disabled}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              }
            />
            <PopoverContent className="w-auto overflow-hidden p-0" align="end">
              {calendarType === 'jalali' ? (
                <JalaliCalendar
                  selected={selectedDate}
                  defaultMonth={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={disabled}
                />
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  defaultMonth={selectedDate}
                  captionLayout="dropdown"
                  onSelect={handleDateSelect}
                  disabled={disabled}
                />
              )}
              <div className="border-t p-2 text-xs text-center text-muted-foreground">
                {calendarType === 'gregorian' ? 'Gregorian Calendar' : 'Jalali (Persian) Calendar'}
              </div>
            </PopoverContent>
          </Popover>
          
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}