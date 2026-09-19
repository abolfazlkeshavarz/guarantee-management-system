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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PartShipment, ReceivePartShipmentData } from '../types'

interface PartShipmentReceiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: PartShipment | null
  onConfirm: (data: ReceivePartShipmentData) => Promise<void>
  isLoading?: boolean
}

/**
 * The company opens the parcel and ticks what is actually inside. Unticked
 * parts are recorded as "did not arrive": they are not invoiced, and the
 * technician is asked to send them again.
 */
export function PartShipmentReceiveDialog({
  open,
  onOpenChange,
  shipment,
  onConfirm,
  isLoading,
}: PartShipmentReceiveDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [arrived, setArrived] = useState<Record<number, boolean>>({})
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open && shipment) {
      setArrived(Object.fromEntries(shipment.items.map((i) => [i.id, true])))
      setNotes('')
    }
  }, [open, shipment])

  if (!shipment) return null

  const arrivedCount = shipment.items.filter((i) => arrived[i.id]).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('partShipments.receive.title')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('partShipments.receive.description', {
              id: shipment.id,
              name: shipment.technician_name,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {shipment.items.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                checked={!!arrived[item.id]}
                onChange={(e) => setArrived((prev) => ({ ...prev, [item.id]: e.target.checked }))}
              />
              <span className="min-w-0">
                <span className="block font-medium">{item.component_name}</span>
                <span className="block text-xs text-muted-foreground">
                  <span className="font-mono">{item.guarantee_code}</span>
                  {item.product_name && ` · ${item.product_name}`}
                </span>
                {item.condition_note && (
                  <span className="block text-xs">{item.condition_note}</span>
                )}
              </span>
            </label>
          ))}
        </div>

        <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
          {t('partShipments.receive.summary', { arrived: arrivedCount, total: shipment.items.length })}
        </p>

        <div className="space-y-2">
          <Label>
            {t('common.notes')} ({t('forms.optional')})
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('partShipments.receive.notesPlaceholder')}
            className="resize-none min-h-[70px]"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isLoading || arrivedCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() =>
              onConfirm({
                items: shipment.items.map((i) => ({ id: i.id, received: !!arrived[i.id] })),
                notes: notes.trim() || undefined,
              })
            }
          >
            {isLoading ? t('guarantees.processing') : t('partShipments.receive.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
