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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PartShipment, PayPartShipmentData } from '../types'
import { useMoney } from '../hooks/useMoney'

interface PartShipmentPayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: PartShipment | null
  onConfirm: (data: PayPartShipmentData) => Promise<void>
  isLoading?: boolean
}

export function PartShipmentPayDialog({
  open,
  onOpenChange,
  shipment,
  onConfirm,
  isLoading,
}: PartShipmentPayDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const money = useMoney()
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) {
      setReference('')
      setNotes('')
    }
  }, [open])

  if (!shipment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('partShipments.pay.title')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('partShipments.pay.description', {
              id: shipment.id,
              name: shipment.technician_name,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md bg-muted p-3">
          <span className="font-medium">{t('partShipments.pay.amountDue')}</span>
          <span className="text-lg font-bold">{money.withUnit(shipment.invoice_total)}</span>
        </div>

        <div className="space-y-2">
          <Label>
            {t('partShipments.pay.reference')} ({t('forms.optional')})
          </Label>
          <Input
            dir="ltr"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t('partShipments.pay.referencePlaceholder')}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label>
            {t('common.notes')} ({t('forms.optional')})
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none min-h-[70px]"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() =>
              onConfirm({
                reference: reference.trim() || undefined,
                notes: notes.trim() || undefined,
              })
            }
          >
            {isLoading ? t('guarantees.processing') : t('partShipments.pay.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
