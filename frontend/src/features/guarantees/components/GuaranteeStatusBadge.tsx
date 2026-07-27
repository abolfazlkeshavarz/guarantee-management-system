import { Badge } from '@/components/ui/badge'
import { GuaranteeStatus, GUARANTEE_STATUS_COLORS } from '../types'

interface GuaranteeStatusBadgeProps {
  status: GuaranteeStatus
  className?: string
}

export function GuaranteeStatusBadge({ status, className }: GuaranteeStatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`${GUARANTEE_STATUS_COLORS[status]} ${className || ''}`}
    >
      {status}
    </Badge>
  )
}