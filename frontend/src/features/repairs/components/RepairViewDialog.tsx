import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
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
import { Badge } from '@/components/ui/badge'
import { partRequestService } from '@/features/partRequests/api/partRequests'
import { Calendar, Package, FileText, Wrench, User, Wrench as ComponentIcon } from 'lucide-react'

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

  const { data: partsData } = useQuery({
    queryKey: ['part-requests-for-repair', repair?.id],
    queryFn: () => partRequestService.list(1, 100, '', '', undefined, repair!.id),
    enabled: open && !!repair?.id,
  })
  const linkedParts = partsData?.requests ?? []

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
                      <PartOrigin item={item} />
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

          {/* Which parts were requested for this repair. Fetched here rather
              than embedded in the repair DTO, so listing repairs does not pay
              for a per-row query nobody asked for. */}
          <Separator />
          <div>
            <p className={`text-sm font-medium mb-2 ${isRTL ? 'text-right' : ''}`}>
              {t('repairs.linkedParts')}
            </p>
            {linkedParts.length === 0 ? (
              <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                {t('repairs.noLinkedParts')}
              </p>
            ) : (
              <div className="space-y-2">
                {linkedParts.map((part) => (
                  <div
                    key={part.id}
                    className={`bg-muted p-2 rounded-md text-sm flex items-center justify-between gap-3 ${
                      isRTL ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="font-medium">
                      {part.item_name} × {part.quantity}
                    </span>
                    <Badge variant="outline">
                      {t(`partRequests.status.${part.status}`, { defaultValue: part.status })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

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
}: {
  item: { part_request_id?: number; part_request_delivered_at?: string }
}) {
  const { t, i18n } = useTranslation()
  const { formatDate } = useCalendar()
  const isRTL = i18n.language === 'fa'

  if (!item.part_request_id) {
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
