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
import { SmsTemplate } from '../types'

interface SmsTemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = creating a new custom pattern. */
  template: SmsTemplate | null
  onSubmit: (values: {
    key: string
    title: string
    description: string
    body_id: number
    sample_text: string
  }) => Promise<void>
  isLoading?: boolean
}

/** Digits only, tolerating Persian/Arabic numerals pasted from the panel. */
function parseBodyId(raw: string): number {
  const ascii = raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const digits = ascii.replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

export function SmsTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isLoading,
}: SmsTemplateFormDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bodyId, setBodyId] = useState('')
  const [sampleText, setSampleText] = useState('')

  useEffect(() => {
    if (!open) return
    setKey(template?.key ?? '')
    setTitle(template?.title ?? '')
    setDescription(template?.description ?? '')
    setBodyId(template?.body_id ? String(template.body_id) : '')
    setSampleText(template?.sample_text ?? '')
  }, [open, template])

  const isEdit = !!template
  const canSubmit = title.trim().length >= 2 && (isEdit || key.trim().length >= 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {isEdit ? t('smsTemplates.form.editTitle') : t('smsTemplates.form.createTitle')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('smsTemplates.form.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('smsTemplates.form.key')} *</Label>
            <Input
              dir="ltr"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="poll_invite"
              disabled={isEdit}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit ? t('smsTemplates.form.keyLocked') : t('smsTemplates.form.keyHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('smsTemplates.form.name')} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div className="space-y-2">
            <Label>{t('smsTemplates.form.bodyId')}</Label>
            <Input
              dir="ltr"
              inputMode="numeric"
              value={bodyId}
              onChange={(e) => setBodyId(e.target.value)}
              placeholder="474023"
            />
            <p className="text-xs text-muted-foreground">{t('smsTemplates.form.bodyIdHint')}</p>
          </div>

          <div className="space-y-2">
            <Label>{t('smsTemplates.form.sampleText')}</Label>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder={t('smsTemplates.form.sampleTextPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('smsTemplates.form.sampleTextHint')}</p>
          </div>

          <div className="space-y-2">
            <Label>
              {t('smsTemplates.form.notes')} ({t('forms.optional')})
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isLoading}
            onClick={() =>
              onSubmit({
                key: key.trim(),
                title: title.trim(),
                description: description.trim(),
                body_id: parseBodyId(bodyId),
                sample_text: sampleText.trim(),
              })
            }
          >
            {isLoading ? t('common.saving') : isEdit ? t('common.update') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
