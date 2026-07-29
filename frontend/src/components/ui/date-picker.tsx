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

  // Update when value prop changes
  React.useEffect(() => {
    if (value) {
      const date = typeof value === 'string' ? parseDate(value) : value
      if (date && !isNaN(date.getTime())) {
        setSelectedDate(date)
        setInputValue(formatDate(date, 'YYYY-MM-DD'))
      }
    } else {
      setSelectedDate(undefined)
      setInputValue('')
    }
  }, [value, calendarType, formatDate, parseDate])

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

  // Format the display date for the button
  const displayDate = selectedDate ? formatDate(selectedDate, 'YYYY-MM-DD') : 'Select date'

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
              <Calendar
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                captionLayout="dropdown"
                onSelect={handleDateSelect}
                disabled={disabled}
              />
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