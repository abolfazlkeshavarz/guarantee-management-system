import React, { createContext, useContext, useEffect, useState } from 'react'
import * as jalaali from 'jalaali-js'

export type CalendarType = 'gregorian' | 'jalali'

interface CalendarContextType {
  calendarType: CalendarType
  toggleCalendar: () => void
  setCalendarType: (type: CalendarType) => void
  formatDate: (date: Date | string, format?: string) => string
  parseDate: (dateString: string) => Date | null
  toGregorian: (jalaliDate: { year: number; month: number; day: number }) => Date
  toJalali: (date: Date) => { year: number; month: number; day: number }
  getJalaliMonthName: (month: number) => string
  getGregorianMonthName: (month: number) => string
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

const GREGORIAN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function CalendarProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [calendarType, setCalendarType] = useState<CalendarType>(() => {
    const saved = localStorage.getItem('calendarType')
    return (saved as CalendarType) || 'gregorian'
  })

  useEffect(() => {
    localStorage.setItem('calendarType', calendarType)
  }, [calendarType])

  const toggleCalendar = () => {
    setCalendarType((prev) =>
      prev === 'gregorian' ? 'jalali' : 'gregorian'
    )
  }

  const getJalaliMonthName = (month: number) =>
    JALALI_MONTHS[month - 1] ?? ''

  const getGregorianMonthName = (month: number) =>
    GREGORIAN_MONTHS[month - 1] ?? ''

  const toGregorian = (jalaliDate: {
    year: number
    month: number
    day: number
  }): Date => {
    const g = jalaali.toGregorian(
      jalaliDate.year,
      jalaliDate.month,
      jalaliDate.day
    )

    return new Date(g.gy, g.gm - 1, g.gd)
  }

  const toJalali = (date: Date) => {
    const j = jalaali.toJalaali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    )

    return {
      year: j.jy,
      month: j.jm,
      day: j.jd,
    }
  }

  const parseDate = (value: string): Date | null => {
    if (!value) return null

    const parts = value.split('-')

    if (parts.length === 3) {
      const y = Number(parts[0])
      const m = Number(parts[1])
      const d = Number(parts[2])

      if (
        Number.isNaN(y) ||
        Number.isNaN(m) ||
        Number.isNaN(d)
      ) {
        return null
      }

      if (calendarType === 'jalali') {
        const g = jalaali.toGregorian(y, m, d)
        return new Date(g.gy, g.gm - 1, g.gd)
      }

      return new Date(y, m - 1, d)
    }

    const date = new Date(value)

    return isNaN(date.getTime()) ? null : date
  }

  const formatDate = (
    value: Date | string,
    format = 'YYYY-MM-DD'
  ) => {
    if (!value) return ''

    let date: Date

    if (typeof value === 'string') {
      const parsed = parseDate(value)
      if (!parsed) return ''
      date = parsed
    } else {
      date = value
    }

    if (calendarType === 'gregorian') {
      switch (format) {
        case 'YYYY-MM-DD':
          return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
          ].join('-')

        case 'DD/MM/YYYY':
          return [
            String(date.getDate()).padStart(2, '0'),
            String(date.getMonth() + 1).padStart(2, '0'),
            date.getFullYear(),
          ].join('/')

        case 'MMM DD, YYYY':
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

        case 'full':
          return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })

        default:
          return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
          ].join('-')
      }
    }

    const j = toJalali(date)

    switch (format) {
      case 'YYYY-MM-DD':
        return `${j.year}-${String(j.month).padStart(2, '0')}-${String(j.day).padStart(2, '0')}`

      case 'DD/MM/YYYY':
        return `${String(j.day).padStart(2, '0')}/${String(j.month).padStart(2, '0')}/${j.year}`

      case 'MMM DD, YYYY':
        return `${JALALI_MONTHS[j.month - 1]} ${j.day}، ${j.year}`

      case 'full':
        return `${j.day} ${JALALI_MONTHS[j.month - 1]} ${j.year}`

      default:
        return `${j.year}-${String(j.month).padStart(2, '0')}-${String(j.day).padStart(2, '0')}`
    }
  }

  return (
    <CalendarContext.Provider
      value={{
        calendarType,
        toggleCalendar,
        setCalendarType,
        formatDate,
        parseDate,
        toGregorian,
        toJalali,
        getJalaliMonthName,
        getGregorianMonthName,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)

  if (!context) {
    throw new Error(
      'useCalendar must be used within a CalendarProvider'
    )
  }

  return context
}