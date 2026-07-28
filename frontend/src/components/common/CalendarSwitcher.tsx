import { useCalendar } from '@/contexts/CalendarContext'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'

export function CalendarSwitcher() {
  const { calendarType, toggleCalendar } = useCalendar()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCalendar}
      className="flex items-center gap-2"
    >
      <CalendarIcon className="h-4 w-4" />
      <span>
        {calendarType === 'gregorian' ? 'Gregorian' : 'Jalali (Persian)'}
      </span>
    </Button>
  )
}