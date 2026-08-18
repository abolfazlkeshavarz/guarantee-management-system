import { useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCalendar } from '@/contexts/CalendarContext'
import { settingsService } from '@/api/settings'

/**
 * Pulls the admin-controlled global language/calendar down on first paint and
 * applies it everywhere.
 *
 * Language and calendar used to be per-browser localStorage values with an
 * English default, so a technician or a customer on the public pages had no
 * way to end up in Persian -- the only controls were the switchers, which are
 * now admin-only. This makes the admin's choice the one everyone inherits.
 *
 * The locally cached value is what paints first (avoiding a flash), and the
 * server value overrides it a moment later. A failed request deliberately
 * changes nothing: whatever is cached keeps working offline.
 */
export function GlobalSettingsSync() {
  const { language, setLanguage } = useLanguage()
  const { calendarType, setCalendarType } = useCalendar()

  useEffect(() => {
    let cancelled = false

    settingsService
      .get()
      .then((settings) => {
        if (cancelled) return
        if (settings.language && settings.language !== language) {
          setLanguage(settings.language)
        }
        if (settings.calendar && settings.calendar !== calendarType) {
          setCalendarType(settings.calendar)
        }
      })
      .catch(() => {
        /* keep the locally cached settings */
      })

    return () => {
      cancelled = true
    }
    // Runs once on mount: this is a one-way sync from server -> client, so
    // re-running it whenever the admin toggles would fight the local change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
