import { useState, useEffect } from 'react'
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
import { Gift } from 'lucide-react'
import { PollRecipient } from '../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipients: PollRecipient[]
  onSubmit: (message: string) => void
  isLoading?: boolean
}

/**
 * The follow-up after reading someone's answers: one pattern-based SMS with a
 * single free slot, so the message body is all we ask for here.
 */
export function PollOfferDialog({ open, onOpenChange, recipients, onSubmit, isLoading }: Props) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open) setMessage('')
  }, [open])

  const reachable = recipients.filter((r) => r.customer_phone)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            {t('polls.offers.title')}
          </DialogTitle>
          <DialogDescription>
            {t('polls.offers.desc', { count: reachable.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-gray-50 p-3 max-h-32 overflow-y-auto text-sm">
            {reachable.length === 0 ? (
              <p className="text-muted-foreground">{t('polls.offers.noneReachable')}</p>
            ) : (
              reachable.slice(0, 20).map((r) => (
                <div key={r.id} className="flex justify-between gap-2">
                  <span>{r.customer_name || t('common.unknown')}</span>
                  <span className="text-muted-foreground" dir="ltr">
                    {r.customer_phone}
                  </span>
                </div>
              ))
            )}
            {reachable.length > 20 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('polls.offers.andMore', { count: reachable.length - 20 })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-message">{t('polls.offers.message')}</Label>
            <Textarea
              id="offer-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder={t('polls.offers.messagePlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('polls.offers.messageHint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => onSubmit(message.trim())}
            disabled={isLoading || reachable.length === 0 || message.trim().length < 2}
          >
            {isLoading ? t('common.sending') : t('polls.offers.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
