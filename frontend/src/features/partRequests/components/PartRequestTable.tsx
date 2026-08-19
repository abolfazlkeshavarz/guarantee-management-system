import { type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  Ban,
  Truck,
  PackageCheck,
  PackageSearch,
} from 'lucide-react'
import { PartRequest, PartRequestStatus, PART_REQUEST_NEXT_STATUSES } from '../types'
import { PartRequestStatusBadge } from './PartRequestStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'

const STATUS_ICONS: Record<string, ElementType> = {
  Approved: CheckCircle,
  NotDelivered: Truck,
  Delivered: PackageCheck,
  Cancelled: Ban,
}

const STATUS_CLASSES: Record<string, string> = {
  Approved: 'text-green-600',
  NotDelivered: 'text-blue-600',
  Delivered: 'text-emerald-600',
  Cancelled: 'text-orange-600',
}

interface PartRequestTableProps {
  requests: PartRequest[]
  onView: (request: PartRequest) => void
  /** Admin only: move a request to another status. */
  onStatusChange?: (request: PartRequest, status: PartRequestStatus) => void
  /** Admin only. */
  onDelete?: (request: PartRequest) => void
  /** Technician only: withdraw a request that is still pending. */
  onCancel?: (request: PartRequest) => void
  hideTechnician?: boolean
  isLoading?: boolean
}

export function PartRequestTable({
  requests,
  onView,
  onStatusChange,
  onDelete,
  onCancel,
  hideTechnician,
  isLoading,
}: PartRequestTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <PackageSearch className="h-12 w-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">{t('partRequests.emptyTitle')}</p>
        <p className="text-sm">{t('partRequests.emptyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.id')}</TableHead>
            <TableHead>{t('partRequests.table.item')}</TableHead>
            <TableHead>{t('partRequests.table.quantity')}</TableHead>
            {!hideTechnician && <TableHead>{t('partRequests.table.technician')}</TableHead>}
            <TableHead>{t('partRequests.table.guarantee')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('partRequests.table.requested')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const nextStatuses = PART_REQUEST_NEXT_STATUSES[request.status] || []
            const showStatusActions = !!onStatusChange && nextStatuses.length > 0
            const showCancel = !!onCancel && request.status === 'Pending'

            return (
              <TableRow key={request.id}>
                <TableCell className="font-medium">#{request.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{request.item_name}</span>
                    {(request.items?.length ?? 0) > 1 && (
                      <Badge variant="outline">
                        +{request.items.length - 1}
                      </Badge>
                    )}
                    {request.is_custom_item ? (
                      <Badge
                        variant="outline"
                        className="bg-purple-100 text-purple-800 border-purple-200"
                      >
                        {t('partRequests.customBadge')}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {t(`partRequests.itemType.${request.item_type}`)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{request.quantity}</TableCell>
                {!hideTechnician && <TableCell>{request.technician_name || '-'}</TableCell>}
                <TableCell>
                  {request.guarantee_code ? (
                    <span className="font-mono text-sm">{request.guarantee_code}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {t('partRequests.noGuarantee')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <PartRequestStatusBadge status={request.status} />
                </TableCell>
                <TableCell>
                  <FormattedDate date={request.created_at} format="YYYY/MM/DD" />
                </TableCell>
                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(request)}>
                        <Eye className="me-2 h-4 w-4" />
                        {t('common.view')}
                      </DropdownMenuItem>

                      {showStatusActions && <DropdownMenuSeparator />}
                      {showStatusActions &&
                        nextStatuses.map((status) => {
                          const Icon = STATUS_ICONS[status] || CheckCircle
                          return (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => onStatusChange?.(request, status)}
                              className={STATUS_CLASSES[status]}
                            >
                              <Icon className="me-2 h-4 w-4" />
                              {t(`partRequests.action.${status}`)}
                            </DropdownMenuItem>
                          )
                        })}

                      {showCancel && (
                        <DropdownMenuItem
                          onClick={() => onCancel?.(request)}
                          className="text-orange-600"
                        >
                          <Ban className="me-2 h-4 w-4" />
                          {t('partRequests.action.Cancelled')}
                        </DropdownMenuItem>
                      )}

                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(request)}
                            className="text-destructive"
                          >
                            <Trash2 className="me-2 h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
