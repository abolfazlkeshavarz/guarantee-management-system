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
import { PartRequest, PartRequestStatus } from '../types'
import { PartRequestStatusBadge } from './PartRequestStatusBadge'

interface PartRequestStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: PartRequest | null
  status: PartRequestStatus | null
  onConfirm: (notes: string) => Promise<void>
  isLoading?: boolean
}

const CONFIRM_CLASSES: Record<string, string> = {
  Approved: 'bg-green-600 hover:bg-green-700',
  NotDelivered: 'bg-blue-600 hover:bg-blue-700',
  Delivered: 'bg-emerald-600 hover:bg-emerald-700',
  Cancelled: 'bg-orange-600 hover:bg-orange-700',
}

export function PartRequestStatusDialog({
  open,
  onOpenChange,
  request,
  status,
  onConfirm,
  isLoading,
}: PartRequestStatusDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) setNotes('')
  }, [open])

  if (!request || !status) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t(`partRequests.action.${status}`)}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('partRequests.statusDialogDesc', {
              item: request.item_name,
              quantity: request.quantity,
              technician: request.technician_name,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <PartRequestStatusBadge status={request.status} />
          <span className="text-muted-foreground">{isRTL ? '←' : '→'}</span>
          <PartRequestStatusBadge status={status} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="part-request-status-notes" className={isRTL ? 'text-right block' : ''}>
            {t('partRequests.notesLabel')}
          </Label>
          <Textarea
            id="part-request-status-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('partRequests.reviewNotesPlaceholder')}
            className={`resize-none min-h-[80px] ${isRTL ? 'text-right' : ''}`}
          />
        </div>

        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(notes)}
            disabled={isLoading}
            className={CONFIRM_CLASSES[status]}
          >
            {isLoading ? t('common.saving') : t(`partRequests.action.${status}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
