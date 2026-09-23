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
import { Send } from 'lucide-react'
import { SmsTemplate } from '../types'

interface SmsTemplateTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: SmsTemplate | null
  onConfirm: (to: string, text: string) => Promise<void>
  isLoading?: boolean
}

/**
 * Sends one real message against a pattern, so an admin can confirm the body
 * id is the right one before a customer ever receives it.
 */
export function SmsTemplateTestDialog({
  open,
  onOpenChange,
  template,
  onConfirm,
  isLoading,
}: SmsTemplateTestDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const [to, setTo] = useState('')
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) {
      setTo('')
      setText(t('smsTemplates.test.defaultText'))
    }
  }, [open, t])

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('smsTemplates.test.title')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('smsTemplates.test.description', {
              name: template.title,
              bodyId: template.body_id,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('smsTemplates.test.to')} *</Label>
          <Input
            dir="ltr"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="09123456789"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('smsTemplates.test.text')}</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">{t('smsTemplates.test.textHint')}</p>
        </div>

        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" disabled={!to.trim() || isLoading} onClick={() => onConfirm(to.trim(), text)}>
            <Send className="me-2 h-4 w-4" />
            {isLoading ? t('smsTemplates.test.sending') : t('smsTemplates.test.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
