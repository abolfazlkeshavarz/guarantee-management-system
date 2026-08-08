import React, { createContext, useContext, useEffect, useState } from 'react'
import moment from 'jalali-moment'

export type CalendarType = 'gregorian' | 'jalali'

interface CalendarContextType {
  calendarType: CalendarType
  toggleCalendar: () => void
  setCalendarType: (type: CalendarType) => void
  formatDate: (date: Date | string, format?: string) => string
  formatDateForBackend: (date: Date | string) => string
  parseDate: (dateString: string) => Date | null
  toGregorian: (jalaliDate: { year: number; month: number; day: number }) => Date
  toJalali: (date: Date) => { year: number; month: number; day: number }
  getJalaliMonthName: (month: number) => string
  getGregorianMonthName: (month: number) => string
  getDaysInJalaliMonth: (year: number, month: number) => number
  getJalaliFirstDayOfMonth: (year: number, month: number) => number
  getJalaliMonths: () => Array<{ number: number; name: string; days: number }>
  isJalaliLeapYear: (year: number) => boolean
  isValidDate: (date: any) => boolean
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

// Date strings coming from the backend are always plain Gregorian "YYYY-MM-DD".
function parseGregorianDate(value: string): Date | null {
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

// Correct Jalali month lengths:
// Months 1-6: 31 days
// Months 7-11: 30 days
// Month 12: 29 days (30 in leap years)
function getJalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31
  if (month <= 11) return 30
  // Month 12 (Esfand)
  return isJalaliLeap(year) ? 30 : 29
}

// Jalali leap year detection using the 33-year cycle
function isJalaliLeap(year: number): boolean {
  const remainders = [1, 5, 9, 13, 17, 22, 26, 30]
  return remainders.includes(((year % 33) + 33) % 33)
}

// Build month data with correct day counts
const JALALI_MONTHS_DATA = Array.from({ length: 12 }, (_, i) => ({
  number: i + 1,
  name: JALALI_MONTHS[i],
  days: getJalaliMonthLength(1404, i + 1), // days field here is just for reference
}))

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [calendarType, setCalendarType] = useState<CalendarType>(() => {
    const saved = localStorage.getItem('calendarType')
    return (saved as CalendarType) || 'gregorian'
  })

  useEffect(() => {
    localStorage.setItem('calendarType', calendarType)
  }, [calendarType])

  const toggleCalendar = () => {
    setCalendarType((prev) => (prev === 'gregorian' ? 'jalali' : 'gregorian'))
  }

  const getJalaliMonthName = (month: number) => JALALI_MONTHS[month - 1] ?? ''
  const getGregorianMonthName = (month: number) => GREGORIAN_MONTHS[month - 1] ?? ''

  const getJalaliMonths = (): Array<{ number: number; name: string; days: number }> => {
    // Return months with correct day counts for a reference year
    return JALALI_MONTHS.map((name, i) => ({
      number: i + 1,
      name,
      days: getJalaliMonthLength(1404, i + 1),
    }))
  }

  const isJalaliLeapYear = (year: number): boolean => isJalaliLeap(year)

  const getDaysInJalaliMonth = (year: number, month: number): number => {
    return getJalaliMonthLength(year, month)
  }

  const getJalaliFirstDayOfMonth = (year: number, month: number): number => {
    // Convert the 1st of the Jalali month to Gregorian, then get day-of-week
    const gregorianDate = toGregorianDate({ year, month, day: 1 })
    const dayOfWeek = gregorianDate.getUTCDay() // 0=Sun ... 6=Sat
    // Jalali week starts Saturday: Sat=0, Sun=1, Mon=2, ... Fri=6
    return (dayOfWeek + 1) % 7
  }

  const toGregorianDate = (jalaliDate: { year: number; month: number; day: number }): Date => {
    const jDate = moment(
      `${jalaliDate.year}/${jalaliDate.month}/${jalaliDate.day}`,
      'jYYYY/jMM/jDD'
    )
    const gregorian = jDate.toDate()
    return new Date(Date.UTC(gregorian.getFullYear(), gregorian.getMonth(), gregorian.getDate()))
  }

  const toGregorian = toGregorianDate

  const toJalali = (date: Date): { year: number; month: number; day: number } => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const jDate = moment(utcDate)
    return {
      year: jDate.jYear(),
      month: jDate.jMonth() + 1,
      day: jDate.jDate(),
    }
  }

  const parseDate = (value: string): Date | null => {
    if (!value) return null

    if (calendarType === 'jalali') {
      const parts = value.split('-')
      if (parts.length === 3) {
        const y = Number(parts[0])
        const m = Number(parts[1])
        const d = Number(parts[2])
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
          const jDate = moment(`${y}/${m}/${d}`, 'jYYYY/jMM/jDD')
          if (jDate.isValid()) {
            const gregorian = jDate.toDate()
            return new Date(Date.UTC(gregorian.getFullYear(), gregorian.getMonth(), gregorian.getDate()))
          }
        }
      }
    }

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

  const formatDate = (value: Date | string, format = 'YYYY-MM-DD'): string => {
    if (!value) return ''
    let date: Date
    if (typeof value === 'string') {
      const parsed = parseGregorianDate(value)
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
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        case 'full':
          return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        default:
          return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
          ].join('-')
      }
    }

    // Jalali format
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const jDate = moment(utcDate)
    const jYear = jDate.jYear()
    const jMonth = jDate.jMonth() + 1
    const jDay = jDate.jDate()

    switch (format) {
      case 'YYYY-MM-DD':
        return `${jYear}-${String(jMonth).padStart(2, '0')}-${String(jDay).padStart(2, '0')}`
      case 'DD/MM/YYYY':
        return `${String(jDay).padStart(2, '0')}/${String(jMonth).padStart(2, '0')}/${jYear}`
      case 'MMM DD, YYYY':
        return `${JALALI_MONTHS[jMonth - 1]} ${jDay}، ${jYear}`
      case 'full':
        return `${jDay} ${JALALI_MONTHS[jMonth - 1]} ${jYear}`
      default:
        return `${jYear}-${String(jMonth).padStart(2, '0')}-${String(jDay).padStart(2, '0')}`
    }
  }

  const formatDateForBackend = (value: Date | string): string => {
    if (!value) return ''
    let date: Date
    if (typeof value === 'string') {
      const parsed = parseGregorianDate(value)
      if (!parsed) return ''
      date = parsed
    } else {
      date = value
    }
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
  }

  const isValidDate = (date: any): boolean => {
    if (!date) return false
    if (date instanceof Date) return !isNaN(date.getTime())
    if (typeof date === 'string') return parseDate(date) !== null
    return false
  }

  return (
    <CalendarContext.Provider
      value={{
        calendarType,
        toggleCalendar,
        setCalendarType,
        formatDate,
        formatDateForBackend,
        parseDate,
        toGregorian,
        toJalali,
        getJalaliMonthName,
        getGregorianMonthName,
        getDaysInJalaliMonth,
        getJalaliFirstDayOfMonth,
        getJalaliMonths,
        isJalaliLeapYear,
        isValidDate,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}