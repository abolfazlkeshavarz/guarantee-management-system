import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { GuaranteeStatus, GUARANTEE_STATUS_COLORS } from '../types'

interface GuaranteeStatusBadgeProps {
  status: GuaranteeStatus
  className?: string
}

export function GuaranteeStatusBadge({ status, className }: GuaranteeStatusBadgeProps) {
  const { t } = useTranslation()

  // The badge used to print the raw API value, so every guarantee read
  // "Approved" / "Pending" even in Farsi -- while the `status.*` keys sat
  // unused in both locale files. defaultValue keeps unknown statuses readable.
  const label = t(`status.${status}`, { defaultValue: status })

  return (
    <Badge
      variant="outline"
      className={`${GUARANTEE_STATUS_COLORS[status]} ${className || ''}`}
    >
      {label}
    </Badge>
  )
}
