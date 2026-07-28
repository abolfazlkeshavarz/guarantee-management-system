import { Badge } from '@/components/ui/badge'
import { RepairStatus, REPAIR_STATUS_COLORS } from '../types'

interface RepairStatusBadgeProps {
  status: RepairStatus
  className?: string
}

export function RepairStatusBadge({ status, className }: RepairStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${REPAIR_STATUS_COLORS[status]} ${className || ''}`}
    >
      {status}
    </Badge>
  )
}