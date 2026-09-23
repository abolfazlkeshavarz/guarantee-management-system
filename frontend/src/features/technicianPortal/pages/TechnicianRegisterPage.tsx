import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wrench, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/common/Logo'

interface Field {
  key: 'full_name' | 'username' | 'password' | 'phone' | 'national_id' | 'province' | 'city'
  required: boolean
  type?: string
  /** Latin-only fields read better forced LTR even on a Persian page. */
  ltr?: boolean
}

const FIELDS: Field[] = [
  { key: 'full_name', required: true },
  { key: 'phone', required: true, ltr: true },
  { key: 'national_id', required: true, ltr: true },
  { key: 'province', required: false },
  { key: 'city', required: false },
  { key: 'username', required: true, ltr: true },
  { key: 'password', required: true, type: 'password', ltr: true },
]

/**
 * Public application form. It creates an account that cannot sign in until
 * staff review the details and approve it, so nothing here is trusted: the
 * server ignores any status the client might try to send.
 */
export function TechnicianRegisterPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  const [values, setValues] = useState<Record<string, string>>({})
  const [about, setAbout] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  const missing = FIELDS.filter((f) => f.required && !(values[f.key] ?? '').trim())
  const canSubmit = missing.length === 0 && (values.password ?? '').length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await api.post('/technician/register', {
        full_name: values.full_name?.trim(),
        username: values.username?.trim(),
        password: values.password,
        phone: values.phone?.trim(),
        national_id: values.national_id?.trim(),
        province: values.province?.trim() || undefined,
        city: values.city?.trim() || undefined,
        address: address.trim() || undefined,
        about: about.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.message || t('technicianPortal.register.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className={`pt-8 pb-6 text-center ${isRTL ? 'text-right' : ''}`}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('technicianPortal.register.successTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t('technicianPortal.register.successDesc')}
            </p>
            <Link to="/technician/login">
              <Button className="mt-6 w-full">{t('technicianPortal.register.goToLogin')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6">
        <div className={`text-center ${isRTL ? 'text-right' : ''}`}>
          <Logo height={48} className="mb-3" />
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Wrench className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('technicianPortal.register.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('technicianPortal.register.subtitle')}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>
              {t('technicianPortal.register.formTitle')}
            </CardTitle>
            <CardDescription className={isRTL ? 'text-right' : ''}>
              {t('technicianPortal.register.formDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className={isRTL ? 'text-right' : ''}>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className={isRTL ? 'text-right block' : ''}>
                      {t(`technicianPortal.register.fields.${field.key}`)}
                      {field.required ? ' *' : ''}
                    </Label>
                    <Input
                      type={field.type ?? 'text'}
                      dir={field.ltr ? 'ltr' : undefined}
                      value={values[field.key] ?? ''}
                      onChange={(e) => set(field.key, e.target.value)}
                      autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('technicianPortal.register.passwordHint')}
              </p>

              <div className="space-y-2">
                <Label className={isRTL ? 'text-right block' : ''}>
                  {t('technicianPortal.register.fields.address')}
                </Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className={isRTL ? 'text-right block' : ''}>
                  {t('technicianPortal.register.fields.about')}
                </Label>
                <Textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="resize-none"
                  placeholder={t('technicianPortal.register.aboutPlaceholder')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!canSubmit || isLoading}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isLoading
                  ? t('technicianPortal.register.submitting')
                  : t('technicianPortal.register.submit')}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/technician/login"
                  className={`text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 ${
                    isRTL ? 'flex-row-reverse' : ''
                  }`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('technicianPortal.register.haveAccount')}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
