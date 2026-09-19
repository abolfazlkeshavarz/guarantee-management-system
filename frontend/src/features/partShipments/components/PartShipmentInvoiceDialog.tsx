import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InvoicePartShipmentData, PartShipment } from '../types'
import { parseAmount, useMoney } from '../hooks/useMoney'

interface PartShipmentInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: PartShipment | null
  onConfirm: (data: InvoicePartShipmentData) => Promise<void>
  isLoading?: boolean
}

/**
 * Prices the parts that arrived. The total shown here is only a preview: the
 * server recomputes it from the unit prices and that is what gets invoiced.
 */
export function PartShipmentInvoiceDialog({
  open,
  onOpenChange,
  shipment,
  onConfirm,
  isLoading,
}: PartShipmentInvoiceDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const money = useMoney()
  const [prices, setPrices] = useState<Record<number, string>>({})

  const arrivedItems = shipment?.items.filter((i) => i.received) ?? []

  useEffect(() => {
    if (open && shipment) {
      setPrices(Object.fromEntries(shipment.items.filter((i) => i.received).map((i) => [i.id, ''])))
    }
  }, [open, shipment])

  if (!shipment) return null

  const total = arrivedItems.reduce((sum, i) => sum + parseAmount(prices[i.id] ?? ''), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('partShipments.invoice.title')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('partShipments.invoice.description', {
              id: shipment.id,
              name: shipment.technician_name,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[45vh] overflow-y-auto">
          {arrivedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.component_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.guarantee_code}</p>
              </div>
              <div className="w-44 shrink-0">
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="0"
                  value={prices[item.id] ?? ''}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  aria-label={t('partShipments.invoice.unitPrice')}
                />
                <p className="mt-1 text-[11px] text-muted-foreground text-end">
                  {t('partShipments.currency')}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted p-3">
          <span className="font-medium">{t('partShipments.invoiceTotal')}</span>
          <span className="text-lg font-bold">{money.withUnit(total)}</span>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isLoading || total <= 0}
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() =>
              onConfirm({
                items: arrivedItems.map((i) => ({
                  id: i.id,
                  unit_price: parseAmount(prices[i.id] ?? ''),
                })),
              })
            }
          >
            {isLoading ? t('guarantees.processing') : t('partShipments.invoice.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
