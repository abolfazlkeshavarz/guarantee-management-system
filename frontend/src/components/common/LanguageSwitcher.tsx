import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'
import { settingsService } from '@/api/settings'

/**
 * Admin-only. The language is a single global setting, so flipping it here
 * writes to the server and every other signed-in user (and the public pages)
 * picks it up on their next load. Only rendered on admin surfaces -- the
 * server rejects the write from anyone else.
 */
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [saving, setSaving] = useState(false)

  const handleToggle = async () => {
    const next = language === 'fa' ? 'en' : 'fa'
    // Apply locally first so the UI never feels laggy; the server write is
    // what makes it stick for everyone else.
    setLanguage(next)
    setSaving(true)
    try {
      await settingsService.update({ language: next })
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
      <Languages className="h-4 w-4" />
      <span className="font-vazir">{language === 'fa' ? 'فارسی' : 'English'}</span>
    </Button>
  )
}
