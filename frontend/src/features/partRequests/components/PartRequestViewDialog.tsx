import { type ElementType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { PartRequest } from '../types'
import { PartRequestStatusBadge } from './PartRequestStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'
import { Package, Hash, User, ShieldCheck, FileText, Calendar, Truck } from 'lucide-react'

interface PartRequestViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: PartRequest | null
}

export function PartRequestViewDialog({
  open,
  onOpenChange,
  request,
}: PartRequestViewDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  if (!request) return null

  const DetailRow = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string
    value: ReactNode
    icon?: ElementType
  }) => (
    <div className={`flex items-start gap-3 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {Icon && <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />}
      <div className={isRTL ? 'text-right' : ''}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  )

  const itemTypeLabel = request.is_custom_item
    ? t('partRequests.customBadge')
    : t(`partRequests.itemType.${request.item_type}`)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <span>{t('partRequests.viewTitle')}</span>
            <PartRequestStatusBadge status={request.status} />
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            <span className="font-mono font-medium">#{request.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow
              label={t('partRequests.table.item')}
              value={
                <span>
                  {request.item_name}{' '}
                  <span className="text-muted-foreground">({itemTypeLabel})</span>
                </span>
              }
              icon={Package}
            />
            <DetailRow
              label={t('partRequests.table.quantity')}
              value={request.quantity}
              icon={Hash}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailRow
              label={t('partRequests.table.technician')}
              value={request.technician_name || '-'}
              icon={User}
            />
            <DetailRow
              label={t('partRequests.table.requested')}
              value={<FormattedDate date={request.created_at} format="full" />}
              icon={Calendar}
            />
          </div>

          <Separator />

          {request.guarantee_code ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <p
                className={`text-xs font-semibold text-slate-600 flex items-center gap-1 ${
                  isRTL ? 'flex-row-reverse' : ''
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
                {t('partRequests.linkedGuarantee')}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('partRequests.guaranteeCodeLabel')}
                </span>
                <span className="font-mono font-medium">{request.guarantee_code}</span>
              </div>
              {request.customer_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('partRequests.customer')}</span>
                  <span className="font-medium">{request.customer_name}</span>
                </div>
              )}
              {request.product_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('partRequests.product')}</span>
                  <span className="font-medium">{request.product_name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('partRequests.noGuaranteeLong')}</p>
            </div>
          )}

          {request.notes && (
            <>
              <Separator />
              <DetailRow label={t('partRequests.notesLabel')} value={request.notes} icon={FileText} />
            </>
          )}

          {request.reviewed_by_name && (
            <>
              <Separator />
              <div className={`bg-muted p-3 rounded-md text-sm ${isRTL ? 'text-right' : ''}`}>
                <p className="font-medium">
                  {t('partRequests.reviewedBy', {
                    status: t(`partRequests.status.${request.status}`, {
                      defaultValue: request.status,
                    }),
                    name: request.reviewed_by_name,
                  })}
                </p>
                {request.reviewed_at && (
                  <p className="text-muted-foreground text-xs mt-1">
                    <FormattedDate date={request.reviewed_at} format="full" />
                  </p>
                )}
                {request.review_notes && (
                  <p className="text-muted-foreground mt-1">{request.review_notes}</p>
                )}
              </div>
            </>
          )}

          {request.delivered_at && (
            <DetailRow
              label={t('partRequests.deliveredOn')}
              value={<FormattedDate date={request.delivered_at} format="full" />}
              icon={Truck}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
