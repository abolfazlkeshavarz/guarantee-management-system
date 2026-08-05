import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTechnicianAuth } from '../contexts/TechnicianAuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { Loader2, Wrench, ArrowLeft } from 'lucide-react'

export function TechnicianLoginPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const { login } = useTechnicianAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(username, password)
      navigate('/technician/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || t('technicianPortal.invalidCredentials'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Brand */}
        <div className={`text-center ${isRTL ? 'text-right' : ''}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Wrench className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('technicianPortal.portalTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('technicianPortal.loginSubtitle')}
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className={`text-xl font-bold text-center ${isRTL ? 'text-right' : ''}`}>
              {t('technicianPortal.signIn')}
            </CardTitle>
            <CardDescription className={`text-center ${isRTL ? 'text-right' : ''}`}>
              {t('technicianPortal.signInDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className={isRTL ? 'text-right' : ''}>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className={isRTL ? 'text-right block' : ''}>{t('login.username')}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('login.usernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className={isRTL ? 'text-right' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className={isRTL ? 'text-right block' : ''}>{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={isRTL ? 'text-right' : ''}
                />
              </div>

              <Button type="submit" className={`w-full ${isRTL ? 'flex-row-reverse' : ''}`} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'me-2'}`} />
                    {t('technicianPortal.signingIn')}
                  </>
                ) : (
                  t('technicianPortal.signIn')
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className={`text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <ArrowLeft className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                {t('technicianPortal.backToStaffLogin')}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className={`text-center text-xs text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
          {t('login.footer', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  )
}