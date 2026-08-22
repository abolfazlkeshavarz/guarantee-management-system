import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { FormattedDate } from '@/components/common/FormattedDate'
import { User, Phone, IdCard, MapPin, Calendar } from 'lucide-react'
import { Customer } from '../types'

interface CustomerViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}

/**
 * Read-only detail for one customer.
 *
 * The row menu offered a "view" action long before there was anything to show;
 * it raised a toast naming the customer and stopped there.
 */
export function CustomerViewDialog({ open, onOpenChange, customer }: CustomerViewDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  if (!customer) return null

  const Row = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string
    value: React.ReactNode
    icon: React.ElementType
  }) => (
    <div className={`flex items-start gap-3 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
      <div className={`min-w-0 ${isRTL ? 'text-right' : ''}`}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value || '—'}</p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('customers.viewTitle')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {customer.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Row label={t('customers.table.fullName')} value={customer.full_name} icon={User} />
            <Row label={t('common.phone')} value={customer.phone} icon={Phone} />
            <Row
              label={t('customers.table.nationalId')}
              value={customer.national_id}
              icon={IdCard}
            />
            <Row
              label={t('customers.table.city')}
              value={[customer.province, customer.city].filter(Boolean).join(' - ')}
              icon={MapPin}
            />
          </div>

          <Separator />

          <Row label={t('customers.address')} value={customer.address} icon={MapPin} />
          <Row
            label={t('common.created')}
            value={<FormattedDate date={customer.created_at} format="full" />}
            icon={Calendar}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
