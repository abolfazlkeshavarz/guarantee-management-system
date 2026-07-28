import React, { useState, useEffect, useRef } from 'react'
import { useCalendar } from '@/contexts/CalendarContext'
import { Input } from './input'
import { Button } from './button'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

// Jalali week days
const JALALI_WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const GREGORIAN_WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({ value, onChange, placeholder, disabled, className, required }: DatePickerProps) {
  const { 
    calendarType, 
    formatDate, 
    parseDate, 
    toJalali, 
    toGregorian,
    getJalaliMonthName,
    getGregorianMonthName 
  } = useCalendar()
  
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  // viewDate is always a Gregorian Date object
  const [viewDate, setViewDate] = useState(new Date())
  const pickerRef = useRef<HTMLDivElement>(null)

  // Update input value when value prop changes
  useEffect(() => {
    if (value) {
      const date = typeof value === 'string' ? parseDate(value) : value
      if (date && !isNaN(date.getTime())) {
        setSelectedDate(date)
        setInputValue(formatDate(date, 'YYYY-MM-DD'))
        setViewDate(date)
      }
    } else {
      setSelectedDate(null)
      setInputValue('')
      setViewDate(new Date()) // Reset to current month when cleared
    }
  }, [value, calendarType, formatDate, parseDate])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    
    const parsed = parseDate(val)
    if (parsed) {
      setSelectedDate(parsed)
      setViewDate(parsed)
      onChange?.(parsed.toISOString().split('T')[0])
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setInputValue(formatDate(date, 'YYYY-MM-DD'))
    setViewDate(date)
    onChange?.(date.toISOString().split('T')[0])
    setIsOpen(false)
  }

  const changeJalaliMonth = (delta: number) => {
    const j = toJalali(viewDate)
    let newYear = j.year
    let newMonth = j.month + delta
    
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    } else if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    
    return toGregorian({ year: newYear, month: newMonth, day: 1 })
  }

  const goToPreviousMonth = () => {
    if (calendarType === 'jalali') {
      setViewDate(changeJalaliMonth(-1))
    } else {
      const newDate = new Date(viewDate)
      newDate.setMonth(newDate.getMonth() - 1)
      newDate.setDate(1)
      setViewDate(newDate)
    }
  }

  const goToNextMonth = () => {
    if (calendarType === 'jalali') {
      setViewDate(changeJalaliMonth(1))
    } else {
      const newDate = new Date(viewDate)
      newDate.setMonth(newDate.getMonth() + 1)
      newDate.setDate(1)
      setViewDate(newDate)
    }
  }

  const renderCalendar = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth() + 1
    
    let firstDayOfMonth: number
    let daysInMonth: number
    let monthName: string
    let currentYear: number
    let jalaliMonth: number
    let jalaliYear: number
    
    if (calendarType === 'jalali') {
      const j = toJalali(viewDate)
      jalaliMonth = j.month
      jalaliYear = j.year
      
      // Get the first day of the Jalali month
      const firstDate = toGregorian({ year: jalaliYear, month: jalaliMonth, day: 1 })
      const dayOfWeek = firstDate.getDay()
      
      // In Jalali calendar, week starts on Saturday (6 in JS)
      firstDayOfMonth = (dayOfWeek + 1) % 7
      
      // Get days in month - using jalaali-js directly or a helper
      // Since we don't have getDaysInJalaliMonth in context, we'll calculate it
      const nextMonthFirst = toGregorian({ 
        year: jalaliMonth === 12 ? jalaliYear + 1 : jalaliYear, 
        month: jalaliMonth === 12 ? 1 : jalaliMonth + 1, 
        day: 1 
      })
      const currentMonthFirst = toGregorian({ year: jalaliYear, month: jalaliMonth, day: 1 })
      const diffTime = Math.abs(nextMonthFirst.getTime() - currentMonthFirst.getTime())
      daysInMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      monthName = getJalaliMonthName(jalaliMonth)
      currentYear = jalaliYear
    } else {
      firstDayOfMonth = new Date(year, month - 1, 1).getDay()
      daysInMonth = new Date(year, month, 0).getDate()
      monthName = getGregorianMonthName(month)
      currentYear = year
      jalaliMonth = 0
      jalaliYear = 0
    }

    const weekDays = calendarType === 'jalali' ? JALALI_WEEK_DAYS : GREGORIAN_WEEK_DAYS

    const today = new Date()
    const todayJalali = toJalali(today)
    
    const days = []
    
    // Week header
    days.push(
      <div key="week-header" className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
    )

    // Empty days
    const emptyCells = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      emptyCells.push(
        <div key={`empty-${i}`} className="h-9" />
      )
    }

    // Days
    const dayCells = []
    for (let i = 1; i <= daysInMonth; i++) {
      let isToday = false
      let isSelected = false
      let date: Date
      
      if (calendarType === 'jalali') {
        // Convert Jalali date to Gregorian
        date = toGregorian({ year: jalaliYear, month: jalaliMonth, day: i })
        
        // Check if this is today
        isToday = jalaliYear === todayJalali.year && 
                  jalaliMonth === todayJalali.month && 
                  i === todayJalali.day
        
        // Check if this is selected
        if (selectedDate) {
          const selectedJ = toJalali(selectedDate)
          isSelected = selectedJ.year === jalaliYear && 
                       selectedJ.month === jalaliMonth && 
                       selectedJ.day === i
        }
      } else {
        date = new Date(year, month - 1, i)
        isToday = year === today.getFullYear() && 
                  (month - 1) === today.getMonth() && 
                  i === today.getDate()
        if (selectedDate) {
          isSelected = year === selectedDate.getFullYear() && 
                       (month - 1) === selectedDate.getMonth() && 
                       i === selectedDate.getDate()
        }
      }
      
      const dayOfWeek = (firstDayOfMonth + i - 1) % 7
      const isWeekend = calendarType === 'jalali' 
        ? dayOfWeek === 6 // Friday
        : dayOfWeek === 0 || dayOfWeek === 6

      dayCells.push(
        <button
          key={`day-${i}`}
          onClick={() => handleDateSelect(date)}
          className={cn(
            "h-9 w-9 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            isToday && !isSelected && "border border-primary",
            isWeekend && "text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
          disabled={disabled}
        >
          {i}
        </button>
      )
    }

    const allCells = [...emptyCells, ...dayCells]
    const rows = []
    for (let i = 0; i < allCells.length; i += 7) {
      rows.push(
        <div key={`row-${i}`} className="grid grid-cols-7 gap-1">
          {allCells.slice(i, i + 7)}
        </div>
      )
    }

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-accent rounded-md"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-medium">
            {monthName} {currentYear}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-accent rounded-md"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {days}
        {rows}
      </div>
    )
  }

  return (
    <div ref={pickerRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder ?? 'YYYY-MM-DD'}
          disabled={disabled}
          className={cn("pr-24", className)}
          required={required}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onClick={() => {
                setSelectedDate(null)
                setInputValue('')
                setViewDate(new Date()) // Reset to current month
                onChange?.('')
              }}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-[280px] rounded-md border bg-popover shadow-md">
          {renderCalendar()}
          <div className="border-t p-2 text-xs text-center text-muted-foreground">
            {calendarType === 'gregorian' ? 'Gregorian Calendar' : 'Jalali (Persian) Calendar'}
          </div>
        </div>
      )}
    </div>
  )
}