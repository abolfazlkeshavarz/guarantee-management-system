import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { FormattedDate } from '@/components/common/FormattedDate'
import { Calendar, Truck, User, FileText, PackageCheck, Receipt, Wallet } from 'lucide-react'
import { PartShipment } from '../types'
import { PartShipmentStatusBadge } from './PartShipmentStatusBadge'
import { useMoney } from '../hooks/useMoney'

interface PartShipmentViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: PartShipment | null
}

export function PartShipmentViewDialog({
  open,
  onOpenChange,
  shipment,
}: PartShipmentViewDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const money = useMoney()

  if (!shipment) return null

  const DetailRow = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string
    value: React.ReactNode
    icon?: React.ElementType
  }) => (
    <div className={`flex items-start gap-3 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {Icon && <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />}
      <div className={`min-w-0 ${isRTL ? 'text-right' : ''}`}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value}</p>
      </div>
    </div>
  )

  const showPrices = shipment.status === 'Invoiced' || shipment.status === 'Paid'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{t('partShipments.viewTitle')}</span>
            <PartShipmentStatusBadge status={shipment.status} />
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            <span className="font-mono font-medium">#{shipment.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <DetailRow
              label={t('partShipments.table.technician')}
              value={shipment.technician_name || '-'}
              icon={User}
            />
            <DetailRow
              label={t('partShipments.table.sentOn')}
              value={<FormattedDate date={shipment.sent_on} format="full" />}
              icon={Calendar}
            />
            <DetailRow
              label={t('partShipments.table.method')}
              value={t(`partShipments.method.${shipment.shipping_method}`)}
              icon={Truck}
            />
            <DetailRow
              label={t('partShipments.form.trackingCode')}
              value={
                shipment.tracking_code ? (
                  <span className="font-mono" dir="ltr">
                    {shipment.tracking_code}
                  </span>
                ) : (
                  '-'
                )
              }
            />
          </div>

          {shipment.notes && (
            <DetailRow label={t('partShipments.form.notes')} value={shipment.notes} icon={FileText} />
          )}

          <Separator />

          <p className="text-sm font-medium text-muted-foreground">
            {t('partShipments.partsTitle', { count: shipment.item_count })}
          </p>
          <div className="space-y-2">
            {shipment.items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.component_name}</span>
                  <div className="flex items-center gap-2">
                    {item.received === true && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" variant="outline">
                        {t('partShipments.arrived')}
                      </Badge>
                    )}
                    {item.received === false && (
                      <Badge className="bg-red-100 text-red-800 border-red-200" variant="outline">
                        {t('partShipments.notArrived')}
                      </Badge>
                    )}
                    {showPrices && item.received && (
                      <span className="text-sm font-medium">{money.withUnit(item.unit_price)}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{item.guarantee_code}</span>
                  {item.product_name && ` · ${item.product_name}`}
                  {item.customer_name && ` · ${item.customer_name}`}
                </p>
                {item.condition_note && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('partShipments.form.condition')}: </span>
                    {item.condition_note}
                  </p>
                )}
              </div>
            ))}
          </div>

          {(shipment.received_at || shipment.invoiced_at || shipment.paid_at || shipment.review_notes) && (
            <>
              <Separator />
              <div className="space-y-3">
                {shipment.received_at && (
                  <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      <PackageCheck className="h-4 w-4" />
                      {t('partShipments.timeline.received', {
                        name: shipment.received_by_name || '-',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <FormattedDate date={shipment.received_at} format="full" /> ·{' '}
                      {t('partShipments.timeline.arrivedCount', {
                        arrived: shipment.received_count,
                        total: shipment.item_count,
                      })}
                    </p>
                    {shipment.receive_notes && <p>{shipment.receive_notes}</p>}
                  </div>
                )}

                {shipment.invoiced_at && (
                  <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      {t('partShipments.timeline.invoiced', {
                        name: shipment.invoiced_by_name || '-',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <FormattedDate date={shipment.invoiced_at} format="full" />
                    </p>
                    <p className="font-semibold">
                      {t('partShipments.invoiceTotal')}: {money.withUnit(shipment.invoice_total)}
                    </p>
                  </div>
                )}

                {shipment.paid_at && (
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-2 text-emerald-800">
                      <Wallet className="h-4 w-4" />
                      {t('partShipments.timeline.paid', { name: shipment.paid_by_name || '-' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <FormattedDate date={shipment.paid_at} format="full" />
                    </p>
                    {shipment.payment_reference && (
                      <p>
                        {t('partShipments.pay.reference')}:{' '}
                        <span className="font-mono" dir="ltr">
                          {shipment.payment_reference}
                        </span>
                      </p>
                    )}
                    {shipment.payment_notes && <p>{shipment.payment_notes}</p>}
                  </div>
                )}

                {shipment.review_notes && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">
                      {t(`partShipments.status.${shipment.status}`, { defaultValue: shipment.status })}
                    </p>
                    <p className="text-muted-foreground mt-1">{shipment.review_notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
