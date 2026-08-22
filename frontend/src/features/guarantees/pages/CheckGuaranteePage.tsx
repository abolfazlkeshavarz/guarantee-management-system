import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { publicGuaranteeService } from '../api/publicGuarantee'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GuaranteeStatusBadge } from '../components/GuaranteeStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'
import { useCalendar } from '@/contexts/CalendarContext'
import { Search, ShieldCheck, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/common/Logo'

// Compares date-only values in UTC. The old check ran `new Date(expiry) < new
// Date()`, which parsed the expiry as UTC midnight and so flagged a guarantee
// as expired throughout its final valid day.
function isPastDate(value?: string): boolean {
  if (!value) return false
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return false
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Date.UTC(y, m - 1, d) < today
}

export function CheckGuaranteePage() {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()
  const [code, setCode] = useState('')
  const [searchCode, setSearchCode] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['check-guarantee', searchCode],
    queryFn: () => publicGuaranteeService.checkStatus(searchCode),
    enabled: false,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      setSearchCode(code.trim())
      refetch()
    }
  }

  // Approval carries a time of day, which FormattedDate deliberately drops.
  // The date half still goes through the calendar context; only the clock
  // reading is added on top.
  const formatDateTime = (value: string) => {
    const datePart = formatDate(value, 'full')
    const timePart = new Date(value).toLocaleTimeString(
      i18n.language === 'fa' ? 'fa-IR' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    )
    return `${datePart} — ${timePart}`
  }

  const expired = isPastDate(data?.expiry_date)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Language/calendar are a single global setting an admin controls;
            customers inherit it via GlobalSettingsSync rather than choosing. */}
        <div className="flex justify-center mb-6">
          <Logo height={48} />
        </div>
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{t('public.checkStatus.title')}</CardTitle>
            <CardDescription>
              {t('public.checkStatus.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder={t('public.checkStatus.placeholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('public.checkStatus.checking') : t('public.checkStatus.check')}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('public.checkStatus.notFound')}
                </AlertDescription>
              </Alert>
            )}

            {data && (
              <div className="mt-6 space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('public.checkStatus.guaranteeCode')}</p>
                      <p className="font-mono font-semibold">{data.code}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('common.status')}</p>
                      <GuaranteeStatusBadge status={data.status} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('public.checkStatus.customer')}</p>
                      <p>{data.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('public.checkStatus.product')}</p>
                      <p>{data.product_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('public.checkStatus.purchaseDate')}</p>
                      <p>
                        <FormattedDate date={data.purchase_date} format="full" />
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('public.checkStatus.expiryDate')}</p>
                      <p className={expired ? 'text-red-600 font-medium' : ''}>
                        <FormattedDate date={data.expiry_date} format="full" />
                        {expired && t('public.checkStatus.expired')}
                      </p>
                    </div>
                  </div>
                </div>

                {data.notes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">{t('public.checkStatus.notes')}</p>
                    <p className="text-sm">{data.notes}</p>
                  </div>
                )}

                {data.approved_at && (
                  <p className="text-xs text-muted-foreground">
                    {t('public.checkStatus.approvedOn', { date: formatDateTime(data.approved_at) })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="link" onClick={() => window.location.href = '/register-guarantee'}>
            <ShieldCheck className="me-2 h-4 w-4" />
            {t('public.checkStatus.registerNew')}
          </Button>
        </div>
      </div>
    </div>
  )
}
