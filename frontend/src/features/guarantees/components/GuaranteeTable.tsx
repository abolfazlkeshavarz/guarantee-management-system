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
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Ban,
  AlertTriangle,
  Sparkles,
  Sparkle,
} from 'lucide-react'
import { Guarantee } from '../types'
import { GuaranteeStatusBadge } from './GuaranteeStatusBadge'
import { FormattedDate } from '@/components/common/FormattedDate'

function GuaranteeTierBadge({ tier }: { tier?: string }) {
  const { t } = useTranslation()
  if (!tier) return null
  const colors: Record<string, string> = {
    Golden: 'bg-amber-100 text-amber-800 border-amber-200',
    Normal: 'bg-slate-100 text-slate-800 border-slate-200',
    Expired: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <Badge variant="outline" className={colors[tier] || ''}>
      {t(`guarantees.tier.${tier}`, { defaultValue: tier })}
    </Badge>
  )
}

interface GuaranteeTableProps {
  guarantees: Guarantee[]
  onView: (guarantee: Guarantee) => void
  onEdit: (guarantee: Guarantee) => void
  onApprove: (guarantee: Guarantee) => void
  onReject: (guarantee: Guarantee) => void
  onRenew: (guarantee: Guarantee) => void
  onCancel: (guarantee: Guarantee) => void
  onDelete: (guarantee: Guarantee) => void
  onSetGolden: (guarantee: Guarantee) => void
  onRemoveGolden: (guarantee: Guarantee) => void
  isLoading?: boolean
}

export function GuaranteeTable({
  guarantees,
  onView,
  onEdit,
  onApprove,
  onReject,
  onRenew,
  onCancel,
  onDelete,
  onSetGolden,
  onRemoveGolden,
  isLoading,
}: GuaranteeTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (guarantees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertTriangle className="h-12 w-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">{t('common.noResultsTitle')}</p>
        <p className="text-sm">{t('common.tryAdjustFilters')}</p>
      </div>
    )
  }

  const canEdit = (guarantee: Guarantee) => guarantee.status === 'Pending'
  const canApprove = (guarantee: Guarantee) => guarantee.status === 'Pending'
  const canRenew = (guarantee: Guarantee) =>
    guarantee.status === 'Approved' || guarantee.status === 'Renewed'
  const canCancel = (guarantee: Guarantee) =>
    !['Cancelled', 'Expired'].includes(guarantee.status)

  // ── Golden actions ────────────────────────────────────────────────
  // A guarantee that already HAS a golden period must NOT show
  // "Set Golden" again -- only "Remove Golden" is offered.
  // "Set Golden" is offered only to active guarantees without golden yet.
  const hasGolden = (guarantee: Guarantee) => !!guarantee.golden_expiry_date
  const canSetGolden = (guarantee: Guarantee) =>
    (guarantee.status === 'Approved' || guarantee.status === 'Renewed') &&
    !hasGolden(guarantee)

  const isExpired = (guarantee: Guarantee) => {
    return new Date(guarantee.expiry_date) < new Date() &&
      ['Approved', 'Renewed'].includes(guarantee.status)
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('guarantees.table.code')}</TableHead>
            <TableHead>{t('guarantees.table.customer')}</TableHead>
            <TableHead>{t('guarantees.table.product')}</TableHead>
            <TableHead>{t('guarantees.table.purchaseDate')}</TableHead>
            <TableHead>{t('guarantees.goldenExpiry')}</TableHead>
            <TableHead>{t('guarantees.table.expiryDate')}</TableHead>
            <TableHead>{t('guarantees.tier._')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('guarantees.approvedByColumn')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guarantees.map((guarantee) => (
            <TableRow key={guarantee.id} className={isExpired(guarantee) ? 'bg-red-50/50' : ''}>
              <TableCell className="font-medium">{guarantee.code}</TableCell>
              <TableCell>{guarantee.customer_name}</TableCell>
              <TableCell>{guarantee.product_name}</TableCell>
              <TableCell>
                <FormattedDate date={guarantee.purchase_date} format="YYYY/MM/DD" />
              </TableCell>
              <TableCell>
                {guarantee.golden_expiry_date ? (
                  <FormattedDate date={guarantee.golden_expiry_date} format="YYYY/MM/DD" />
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <span className={isExpired(guarantee) ? 'text-red-600 font-medium' : ''}>
                  <FormattedDate date={guarantee.expiry_date} format="YYYY/MM/DD" />
                  {isExpired(guarantee) && ` ${t('guarantees.expired')}`}
                </span>
              </TableCell>
              <TableCell>
                <GuaranteeTierBadge tier={guarantee.tier} />
              </TableCell>
              <TableCell>
                <GuaranteeStatusBadge status={guarantee.status} />
              </TableCell>
              <TableCell>
                {guarantee.approved_by_username || t('guarantees.notReviewed')}
              </TableCell>
              <TableCell className="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(guarantee)}>
                      <Eye className="me-2 h-4 w-4" />
                      {t('common.view')}
                    </DropdownMenuItem>
                    {canEdit(guarantee) && (
                      <DropdownMenuItem onClick={() => onEdit(guarantee)}>
                        <Edit className="me-2 h-4 w-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                    )}
                    {canApprove(guarantee) && (
                      <>
                        <DropdownMenuItem onClick={() => onApprove(guarantee)} className="text-green-600">
                          <CheckCircle className="me-2 h-4 w-4" />
                          {t('common.approve')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(guarantee)} className="text-red-600">
                          <XCircle className="me-2 h-4 w-4" />
                          {t('common.reject')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {canRenew(guarantee) && (
                      <DropdownMenuItem onClick={() => onRenew(guarantee)} className="text-blue-600">
                        <RefreshCw className="me-2 h-4 w-4" />
                        {t('common.renew')}
                      </DropdownMenuItem>
                    )}
                    {canCancel(guarantee) && (
                      <DropdownMenuItem onClick={() => onCancel(guarantee)} className="text-orange-600">
                        <Ban className="me-2 h-4 w-4" />
                        {t('common.cancel')}
                      </DropdownMenuItem>
                    )}

                    {/* Golden section: only ONE of the two items is ever visible */}
                    {(canSetGolden(guarantee) || hasGolden(guarantee)) && (
                      <DropdownMenuSeparator />
                    )}
                    {canSetGolden(guarantee) && (
                      <DropdownMenuItem onClick={() => onSetGolden(guarantee)} className="text-amber-600">
                        <Sparkles className="me-2 h-4 w-4" />
                        {t('guarantees.setGolden')}
                      </DropdownMenuItem>
                    )}
                    {hasGolden(guarantee) && (
                      <DropdownMenuItem onClick={() => onRemoveGolden(guarantee)} className="text-amber-600">
                        <Sparkle className="me-2 h-4 w-4" />
                        {t('guarantees.removeGolden')}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(guarantee)}
                      className="text-destructive"
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
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