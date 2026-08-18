import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { FormattedDate } from '@/components/common/FormattedDate'
import { renewSchema, RenewFormValues } from '../schemas/guaranteeSchema'
import { Guarantee } from '../types'

interface RenewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee: Guarantee | null
  onConfirm: (data: RenewFormValues) => Promise<void>
  isLoading?: boolean
}

export function RenewDialog({
  open,
  onOpenChange,
  guarantee,
  onConfirm,
  isLoading,
}: RenewDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const form = useForm<RenewFormValues>({
    resolver: zodResolver(renewSchema),
    defaultValues: {
      new_expiry_date: '',
      notes: '',
    },
  })

  const handleSubmit = async (data: RenewFormValues) => {
    await onConfirm(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>{t('guarantees.renewTitle')}</DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('guarantees.renewDesc')}
            <br />
            <span className="font-semibold">
              {t('guarantees.renewGuaranteeLabel')}: {guarantee?.code}
            </span>
            {' - '}
            <span className="text-muted-foreground">{guarantee?.customer_name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className={`bg-muted p-3 rounded-md text-sm ${isRTL ? 'text-right' : ''}`}>
          <p>
            <span className="font-medium">{t('guarantees.currentExpiry')}:</span>{' '}
            {/* was date-fns format(), which is Gregorian-only and ignored the
                active Jalali calendar */}
            <FormattedDate date={guarantee?.expiry_date} format="MMM DD, YYYY" />
          </p>
          <p>
            <span className="font-medium">{t('common.status')}:</span>{' '}
            {guarantee?.status && t(`status.${guarantee.status}`, { defaultValue: guarantee.status })}
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('guarantees.newExpiryDate')} *</FormLabel>
                  <FormControl>
                    {/* native <input type="date"> always renders a Gregorian
                        picker; DatePicker follows the active calendar */}
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('common.notes')} ({t('forms.optional')})
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('guarantees.renewNotesPlaceholder')}
                      className="resize-none min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? t('guarantees.processing') : t('guarantees.renewTitle')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}