import { useState } from 'react'
import { useCalendar } from '@/contexts/CalendarContext'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { settingsService } from '@/api/settings'

/**
 * Admin-only, same as LanguageSwitcher: the calendar is one global setting
 * that everyone else inherits.
 */
export function CalendarSwitcher() {
  const { calendarType, setCalendarType } = useCalendar()
  const [saving, setSaving] = useState(false)

  const handleToggle = async () => {
    const next = calendarType === 'gregorian' ? 'jalali' : 'gregorian'
    setCalendarType(next)
    setSaving(true)
    try {
      await settingsService.update({ calendar: next })
    } catch {
      /* local change still applies for this browser */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={saving}
      className="flex items-center gap-2"
    >
      <CalendarIcon className="h-4 w-4" />
      <span>{calendarType === 'gregorian' ? 'Gregorian' : 'Jalali (Persian)'}</span>
    </Button>
  )
}
