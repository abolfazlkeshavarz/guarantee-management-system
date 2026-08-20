import { useTranslation } from 'react-i18next'
import { formatRemaining } from '@/lib/guaranteeRemaining'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Repair } from '../types'
import { RepairStatusBadge } from './RepairStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'
import { useCalendar } from '@/contexts/CalendarContext'
import {
  Calendar,
  Package,
  FileText,
  Wrench,
  User,
  AlertTriangle,
  ShieldCheck,
  Wrench as ComponentIcon,
} from 'lucide-react'

interface RepairViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
}

export function RepairViewDialog({
  open,
  onOpenChange,
  repair,
}: RepairViewDialogProps) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()
  const isRTL = i18n.language === 'fa'

  if (!repair) return null

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: React.ElementType }) => (
    <div className={`flex items-start gap-3 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {Icon && <Icon className={`h-5 w-5 mt-0.5 text-muted-foreground ${isRTL ? 'ml-2' : 'mr-2'}`} />}
      <div className={isRTL ? 'text-right' : ''}>
        <p className={`text-sm font-medium text-muted-foreground ${isRTL ? 'text-right' : ''}`}>{label}</p>
        <p className={`text-sm ${isRTL ? 'text-right' : ''}`}>{value}</p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>{t('repairView.title')}</span>
            <RepairStatusBadge status={repair.status} />
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            <span className="font-mono font-medium">{repair.guarantee_code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'text-right' : ''}`}>
            <DetailRow label={t('guarantees.table.customer')} value={repair.customer_name} icon={User} />
            <DetailRow label={t('guarantees.table.product')} value={repair.product_name} icon={Package} />
          </div>

          <GuaranteeRemaining
            daysRemaining={repair.guarantee_days_remaining}
            expiryDate={repair.guarantee_expiry_date}
          />

          <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'text-right' : ''}`}>
            <DetailRow label={t('repairs.table.technician')} value={repair.technician_name || t('repairView.unassigned')} icon={Wrench} />
            <DetailRow
              label={t('repairView.submitted')}
              value={<FormattedDate date={repair.created_at} format="full" />}
              icon={Calendar}
            />
          </div>

          {repair.description && (
            <>
              <Separator />
              <DetailRow label={t('repairView.notes')} value={repair.description} icon={FileText} />
            </>
          )}

          {repair.components.length > 0 && (
            <>
              <Separator />
              <div className={isRTL ? 'text-right' : ''}>
                <p className={`text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <ComponentIcon className="h-4 w-4" /> {t('repairItems.componentsReplaced')}
                </p>
                <div className="space-y-2">
                  {repair.components.map((item) => (
                    <div key={item.id} className="bg-muted p-2 rounded-md text-sm">
                      <p className="font-medium">{item.component_name}</p>
                      {item.report && <p className="text-muted-foreground">{item.report}</p>}
                      <PartOrigin item={item} requireSource />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {repair.services.length > 0 && (
            <>
              <Separator />
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('repairItems.servicesPerformed')}</p>
                <div className="space-y-2">
                  {repair.services.map((item) => (
                    <div key={item.id} className="bg-muted p-2 rounded-md text-sm">
                      <p className="font-medium">{item.service_name}</p>
                      {item.report && <p className="text-muted-foreground">{item.report}</p>}
                      <PartOrigin item={item} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {repair.reviewed_by_name && (
            <>
              <Separator />
              <div className={`bg-muted p-3 rounded-md text-sm ${isRTL ? 'text-right' : ''}`}>
                {/* reviewedBy/reviewedOn carry {{status}}/{{name}}/{{date}}
                    placeholders -- every one has to be supplied here or the
                    raw "{{status}}" text renders. The status key is the
                    top-level status.<Value> (capitalised); repairs.status.*
                    does not exist, so the old lookup always fell back to the
                    untranslated English value. */}
                <p className="font-medium">
                  {t('repairView.reviewedBy', {
                    status: t(`status.${repair.status}`, { defaultValue: repair.status }),
                    name: repair.reviewed_by_name,
                  })}
                  {repair.reviewed_at &&
                    t('repairView.reviewedOn', {
                      date: formatDate(repair.reviewed_at, 'full'),
                    })}
                </p>
                {repair.review_notes && <p className="text-muted-foreground mt-1">{repair.review_notes}</p>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Where a reported item came from. A part traced back to the request that
 * issued it is the difference between the report being a record and being a
 * claim, so the absence of a link is worth showing too -- that line was
 * entered against the catalog with no delivery behind it.
 */
function PartOrigin({
  item,
  requireSource = false,
}: {
  item: { part_request_id?: number; part_request_delivered_at?: string }
  /**
   * Only components must come from a delivered request. A service without one
   * is the ordinary case, so flagging it would cry wolf and teach the reader
   * to ignore the warning that matters.
   */
  requireSource?: boolean
}) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()
  const isRTL = i18n.language === 'fa'

  if (!item.part_request_id) {
    if (!requireSource) return null
    return (
      <p className={`text-xs text-amber-700 mt-1 ${isRTL ? 'text-right' : ''}`}>
        {t('repairItems.noSourceRequest')}
      </p>
    )
  }

  return (
    <p className={`text-xs text-muted-foreground mt-1 ${isRTL ? 'text-right' : ''}`}>
      {t('repairItems.fromRequest', { id: item.part_request_id })}
      {item.part_request_delivered_at &&
        ` · ${t('repairItems.deliveredOn', {
          date: formatDate(item.part_request_delivered_at),
        })}`}
    </p>
  )
}

/**
 * How much guarantee is left, stated in the units people actually use: months
 * once there is more than a month to go, days when the end is close.
 *
 * An expired guarantee is deliberately loud. It is the fact that changes how
 * the job is billed, and it is easy to miss in a quiet grey row -- so it gets
 * colour, a border and an icon rather than a line of muted text.
 */
function GuaranteeRemaining({
  daysRemaining,
  expiryDate,
}: {
  daysRemaining?: number
  expiryDate?: string
}) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()
  const isRTL = i18n.language === 'fa'

  if (daysRemaining === undefined || !expiryDate) return null

  const expired = daysRemaining < 0
  const amount = formatRemaining(t, daysRemaining)

  const tone = expired
    ? 'bg-red-50 border-red-300 text-red-800'
    : daysRemaining <= 30
      ? 'bg-amber-50 border-amber-300 text-amber-900'
      : 'bg-emerald-50 border-emerald-200 text-emerald-900'

  return (
    <div className={`rounded-md border p-3 ${tone} ${isRTL ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {expired ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}
        <p className="text-sm font-semibold">
          {expired
            ? t('guarantees.remaining.expiredAgo', { amount })
            : t('guarantees.remaining.left', { amount })}
        </p>
      </div>
      <p className="text-xs mt-1 opacity-80">
        {t('guarantees.remaining.expiresOn', { date: formatDate(expiryDate, 'YYYY/MM/DD') })}
      </p>
    </div>
  )
}
