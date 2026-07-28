import { useCalendar } from '@/contexts/CalendarContext'

interface FormattedDateProps {
  date: string | Date | null | undefined
  format?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MMM DD, YYYY' | 'full'
  className?: string
  fallback?: string
}

export function FormattedDate({ 
  date, 
  format = 'YYYY-MM-DD', 
  className = '',
  fallback = '-'
}: FormattedDateProps) {
  const { formatDate } = useCalendar()
  
  if (!date) return <span className={className}>{fallback}</span>
  
  try {
    const formatted = formatDate(date, format)
    return <span className={className}>{formatted}</span>
  } catch (error) {
    console.error('Error formatting date:', error)
    return <span className={className}>{fallback}</span>
  }
}