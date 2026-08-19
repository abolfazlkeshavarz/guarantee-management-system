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
import { MoreHorizontal, Eye, CheckCircle, XCircle, Ban, Trash2 } from 'lucide-react'
import { Repair } from '../types'
import { RepairStatusBadge } from './RepairStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'

interface RepairTableProps {
  repairs: Repair[]
  onView: (repair: Repair) => void
  onApprove: (repair: Repair) => void
  onReject: (repair: Repair) => void
  onCancel: (repair: Repair) => void
  onDelete?: (repair: Repair) => void
  isLoading?: boolean
}

export function RepairTable({
  repairs,
  onView,
  onApprove,
  onReject,
  onCancel,
  onDelete,
  isLoading,
}: RepairTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (repairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">{t('common.noResultsTitle')}</p>
        <p className="text-sm">{t('common.tryAdjustFilters')}</p>
      </div>
    )
  }

  const isPending = (repair: Repair) => repair.status === 'Pending'
  const canCancel = (repair: Repair) => repair.status === 'Pending' || repair.status === 'Approved'

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('repairs.table.guarantee')}</TableHead>
            <TableHead className="text-center">{t('repairs.repairCount')}</TableHead>
            <TableHead>{t('guarantees.table.customer')}</TableHead>
            <TableHead>{t('repairs.table.technician')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('common.created')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {repairs.map((repair) => (
            <TableRow key={repair.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {repair.guarantee_code}
                  {/* Out-of-warranty work bills differently, so it has to be
                      obvious at a glance in the listing. */}
                  {repair.guarantee_was_expired && (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                      {t('repairs.outOfWarranty')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                {/* How often this guarantee has come back. A high count is the
                    signal worth spotting, so it is highlighted past 1. */}
                <Badge
                  variant="outline"
                  className={
                    repair.repair_count_for_guarantee > 1
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : ''
                  }
                >
                  {repair.repair_count_for_guarantee ?? 1}
                </Badge>
              </TableCell>
              <TableCell>{repair.customer_name}</TableCell>
              <TableCell>{repair.technician_name || 'Unassigned'}</TableCell>
              <TableCell>
                <RepairStatusBadge status={repair.status} />
              </TableCell>
              <TableCell>
                <FormattedDate date={repair.created_at} format="YYYY/MM/DD" />
              </TableCell>
              <TableCell className="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" className="h-8 w-8 p-0" />}
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(repair)}>
                      <Eye className="me-2 h-4 w-4" />
                      {t('common.view')}
                    </DropdownMenuItem>
                    {isPending(repair) && (
                      <>
                        <DropdownMenuItem onClick={() => onApprove(repair)} className="text-green-600">
                          <CheckCircle className="me-2 h-4 w-4" />
                          {t('common.approve')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(repair)} className="text-red-600">
                          <XCircle className="me-2 h-4 w-4" />
                          {t('common.reject')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {canCancel(repair) && (
                      <DropdownMenuItem onClick={() => onCancel(repair)} className="text-orange-600">
                        <Ban className="me-2 h-4 w-4" />
                        {t('common.cancel')}
                      </DropdownMenuItem>
                    )}
                    {/* Delete is admin-only; technical technicians review but
                        never destroy, so the item is simply absent for them. */}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(repair)}
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
          ))}
        </TableBody>
      </Table>
    </div>
  )
}