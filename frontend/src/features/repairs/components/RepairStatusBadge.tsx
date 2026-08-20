import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { REPAIR_STATUS_COLORS } from '../types'

interface RepairStatusBadgeProps {
  status: string
  className?: string
}

// `status` is typed as a plain string (not the RepairStatus union) because
// repairs created before the workflow redesign may still carry the old
// InProgress/Completed values -- this falls back to a neutral style (and
// the raw untranslated value) instead of breaking for that historical data.
export function RepairStatusBadge({ status, className }: RepairStatusBadgeProps) {
  const { t } = useTranslation()
  const colorClass = REPAIR_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  const key = `repairs.status.${status}`
  const label = t(key, { defaultValue: status })
  return (
    <Badge
      variant="outline"
      className={`${colorClass} ${className || ''}`}
    >
      {label}
    </Badge>
  )
}