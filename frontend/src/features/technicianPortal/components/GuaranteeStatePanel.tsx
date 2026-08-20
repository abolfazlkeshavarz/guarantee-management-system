import { useTranslation } from 'react-i18next'
import { formatRemaining } from '@/lib/guaranteeRemaining'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { useCalendar } from '@/contexts/CalendarContext'
import type { Guarantee } from '../api/technicianGuarantees'

/**
 * What the technician is told once a guarantee code checks out.
 *
 * Expired cover is not a refusal -- the work still gets done and recorded --
 * but it bills differently, and the technician is the last person who can
 * notice before the job starts. So an expired guarantee is stated in red and
 * named as a billing consequence, rather than being reported as "valid" with
 * the expiry buried in a date the reader has to compare against today.
 */
export function GuaranteeStatePanel({ guarantee }: { guarantee: Guarantee }) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()
  const isRTL = i18n.language === 'fa'

  const expiry = new Date(guarantee.expiry_date)
  const today = new Date()
  const days = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000)
  const expired = days < 0

  const amount = formatRemaining(t, days)

  const tone = expired
    ? 'bg-red-50 border-red-300 text-red-800'
    : days <= 30
      ? 'bg-amber-50 border-amber-300 text-amber-900'
      : 'bg-green-50 border-green-200 text-green-800'

  return (
    <div
      className={`p-3 border rounded-md text-sm flex items-start gap-2 ${tone} ${
        isRTL ? 'flex-row-reverse' : ''
      }`}
    >
      {expired ? (
        <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`} />
      ) : (
        <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`} />
      )}
      <div className={isRTL ? 'text-right' : ''}>
        <p className="font-semibold">
          {expired
            ? t('technicianPortal.guaranteeExpired')
            : t('technicianPortal.guaranteeValid')}
        </p>
        <p>
          {guarantee.product_name} — {guarantee.customer_name}
        </p>
        <p className="mt-1 font-medium">
          {expired
            ? t('guarantees.remaining.expiredAgo', { amount })
            : t('guarantees.remaining.left', { amount })}
          {' · '}
          {t('guarantees.remaining.expiresOn', {
            date: formatDate(guarantee.expiry_date, 'YYYY/MM/DD'),
          })}
        </p>
        {expired && <p className="mt-1 text-xs">{t('technicianPortal.expiredBillingNote')}</p>}
      </div>
    </div>
  )
}
