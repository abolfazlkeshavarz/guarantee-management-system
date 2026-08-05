import { Badge } from '@/components/ui/badge'
import { REPAIR_STATUS_COLORS } from '../types'

interface RepairStatusBadgeProps {
  status: string
  className?: string
}

// `status` is typed as a plain string (not the RepairStatus union) because
// repairs created before the workflow redesign may still carry the old
// InProgress/Completed values -- this falls back to a neutral style instead
// of breaking for that historical data.
export function RepairStatusBadge({ status, className }: RepairStatusBadgeProps) {
  const colorClass = REPAIR_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  return (
    <Badge
      variant="outline"
      className={`${colorClass} ${className || ''}`}
    >
      {status}
    </Badge>
  )
}