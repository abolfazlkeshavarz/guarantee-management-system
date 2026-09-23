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
import { Separator } from '@/components/ui/separator'
import { FormattedDate } from '@/components/common/FormattedDate'
import { CheckCircle, XCircle } from 'lucide-react'
import { Technician } from '../types'

interface TechnicianReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  technician: Technician | null
  onConfirm: (status: 'Approved' | 'Rejected', notes: string) => Promise<void>
  isLoading?: boolean
}

/**
 * Everything the applicant told us, in one place, so a decision does not need
 * a second screen. Rejecting asks for a reason; approving does not.
 */
export function TechnicianReviewDialog({
  open,
  onOpenChange,
  technician,
  onConfirm,
  isLoading,
}: TechnicianReviewDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [notes, setNotes] = useState('')
  const [intent, setIntent] = useState<'Approved' | 'Rejected' | null>(null)

  useEffect(() => {
    if (!open) {
      setNotes('')
      setIntent(null)
    }
  }, [open])

  if (!technician) return null

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-end break-words">{value || '—'}</span>
    </div>
  )

  const region = [technician.province, technician.city].filter(Boolean).join(' - ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('technicians.review.title')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('technicians.review.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-3">
          <Row label={t('technicians.form.fullName')} value={technician.full_name} />
          <Row
            label={t('settings.username')}
            value={
              <span className="font-mono" dir="ltr">
                {technician.username}
              </span>
            }
          />
          <Row
            label={t('common.phone')}
            value={
              <span dir="ltr">{technician.phone}</span>
            }
          />
          <Row
            label={t('customers.table.nationalId')}
            value={<span dir="ltr">{technician.national_id}</span>}
          />
          <Row label={t('exports.region')} value={region} />
          <Row label={t('customers.address')} value={technician.address} />
          {technician.applied_at && (
            <Row
              label={t('technicians.review.appliedOn')}
              value={<FormattedDate date={technician.applied_at} format="full" />}
            />
          )}
        </div>

        {technician.about && (
          <>
            <Separator />
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t('technicians.review.about')}
              </p>
              <p className="text-sm whitespace-pre-wrap">{technician.about}</p>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>
            {t('technicians.review.notes')}
            {intent === 'Rejected' ? ' *' : ` (${t('forms.optional')})`}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
            placeholder={t('technicians.review.notesPlaceholder')}
            maxLength={2000}
          />
        </div>

        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isLoading || !notes.trim()}
            className="bg-red-600 hover:bg-red-700"
            onMouseEnter={() => setIntent('Rejected')}
            onFocus={() => setIntent('Rejected')}
            onClick={() => onConfirm('Rejected', notes.trim())}
          >
            <XCircle className="me-2 h-4 w-4" />
            {t('common.reject')}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
            onMouseEnter={() => setIntent('Approved')}
            onFocus={() => setIntent('Approved')}
            onClick={() => onConfirm('Approved', notes.trim())}
          >
            <CheckCircle className="me-2 h-4 w-4" />
            {t('common.approve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
