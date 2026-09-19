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
import { PartShipment } from '../types'

interface PartShipmentRejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: PartShipment | null
  onConfirm: (notes: string) => Promise<void>
  isLoading?: boolean
}

/** For a parcel that never arrived or held nothing usable. A reason is required. */
export function PartShipmentRejectDialog({
  open,
  onOpenChange,
  shipment,
  onConfirm,
  isLoading,
}: PartShipmentRejectDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) setNotes('')
  }, [open])

  if (!shipment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('partShipments.reject.title')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('partShipments.reject.description', {
              id: shipment.id,
              name: shipment.technician_name,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('partShipments.reject.reason')} *</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('partShipments.reject.reasonPlaceholder')}
            className="resize-none min-h-[90px]"
            maxLength={2000}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isLoading || !notes.trim()}
            className="bg-red-600 hover:bg-red-700"
            onClick={() => onConfirm(notes.trim())}
          >
            {isLoading ? t('guarantees.processing') : t('partShipments.reject.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
