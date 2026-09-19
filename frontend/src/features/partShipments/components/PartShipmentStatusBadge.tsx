import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { PART_SHIPMENT_STATUS_COLORS } from '../types'

interface PartShipmentStatusBadgeProps {
  status: string
  className?: string
}

export function PartShipmentStatusBadge({ status, className }: PartShipmentStatusBadgeProps) {
  const { t } = useTranslation()
  const colorClass =
    PART_SHIPMENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'

  return (
    <Badge variant="outline" className={`${colorClass} ${className || ''}`}>
      {t(`partShipments.status.${status}`, { defaultValue: status })}
    </Badge>
  )
}
