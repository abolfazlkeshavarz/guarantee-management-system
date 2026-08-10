import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { PART_REQUEST_STATUS_COLORS } from '../types'

interface PartRequestStatusBadgeProps {
  status: string
  className?: string
}

export function PartRequestStatusBadge({ status, className }: PartRequestStatusBadgeProps) {
  const { t } = useTranslation()
  const colorClass =
    PART_REQUEST_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  const label = t(`partRequests.status.${status}`, { defaultValue: status })

  return (
    <Badge variant="outline" className={`${colorClass} ${className || ''}`}>
      {label}
    </Badge>
  )
}
