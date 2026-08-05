// frontend/src/pages/LoginPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { useTechnicianAuth } from '@/features/technicianPortal/contexts/TechnicianAuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { Loader2, ShieldCheck, Shield, UserCog, FileCheck, Search } from 'lucide-react'

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuth()
  const { login: technicianLogin } = useTechnicianAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    setIsLoading(true)

    // First try admin login
    try {
      await login(data)
      navigate('/dashboard')
      return
    } catch (adminErr: any) {
      // Only fall through to technician login on auth failure
      if (adminErr.response?.status !== 401) {
        setError('Something went wrong. Please try again.')
        setIsLoading(false)
        return
      }
    }

    // Then try technician login
    try {
      await technicianLogin(data.username, data.password)
      navigate('/technician/dashboard')
    } catch (techErr: any) {
      setError(techErr.response?.data?.message || 'Invalid username or password')
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
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Customer Actions Card */}
        <Card className="shadow-md border-2 border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('login.customerServices')}
            </CardTitle>
            <CardDescription>
              {t('login.customerServicesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/register-guarantee" className="w-full">
              <Button variant="default" className="w-full">
                <FileCheck className="me-2 h-4 w-4" />
                {t('login.register')}
              </Button>
            </Link>
            <Link to="/check-guarantee" className="w-full">
              <Button variant="outline" className="w-full">
                <Search className="me-2 h-4 w-4" />
                {t('login.checkStatus')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Staff Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
              <UserCog className="h-5 w-5 text-muted-foreground" />
              {t('login.staffLogin')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('login.staffLoginDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">{t('login.username')}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('login.usernamePlaceholder')}
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('login.loggingIn')}
                  </>
                ) : (
                  t('login.signIn')
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {t('login.admin')}
                </span>
                <Separator orientation="vertical" className="h-3" />
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {t('login.technician')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          {t('login.footer', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  )
}