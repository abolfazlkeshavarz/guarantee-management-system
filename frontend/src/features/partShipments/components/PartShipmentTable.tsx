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
  Ban,
  PackageCheck,
  Receipt,
  Wallet,
  XCircle,
  PackageSearch,
} from 'lucide-react'
import { FormattedDate } from '@/components/common/FormattedDate'
import { PartShipment } from '../types'
import { PartShipmentStatusBadge } from './PartShipmentStatusBadge'
import { useMoney } from '../hooks/useMoney'

interface PartShipmentTableProps {
  shipments: PartShipment[]
  onView: (shipment: PartShipment) => void
  /** Staff only. */
  onReceive?: (shipment: PartShipment) => void
  onInvoice?: (shipment: PartShipment) => void
  onPay?: (shipment: PartShipment) => void
  onReject?: (shipment: PartShipment) => void
  onDelete?: (shipment: PartShipment) => void
  /** Technician only: withdraw a parcel that has not been received yet. */
  onCancel?: (shipment: PartShipment) => void
  hideTechnician?: boolean
  isLoading?: boolean
}

export function PartShipmentTable({
  shipments,
  onView,
  onReceive,
  onInvoice,
  onPay,
  onReject,
  onDelete,
  onCancel,
  hideTechnician,
  isLoading,
}: PartShipmentTableProps) {
  const { t } = useTranslation()
  const money = useMoney()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <PackageSearch className="h-12 w-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">{t('partShipments.emptyTitle')}</p>
        <p className="text-sm">{t('partShipments.emptyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.id')}</TableHead>
            {!hideTechnician && <TableHead>{t('partShipments.table.technician')}</TableHead>}
            <TableHead>{t('partShipments.table.parts')}</TableHead>
            <TableHead>{t('partShipments.table.method')}</TableHead>
            <TableHead>{t('partShipments.table.sentOn')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('partShipments.table.amount')}</TableHead>
            <TableHead className="text-end">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const canReceive = !!onReceive && shipment.status === 'Sent'
            const canReject = !!onReject && shipment.status === 'Sent'
            const canInvoice = !!onInvoice && shipment.status === 'Received'
            const canPay = !!onPay && shipment.status === 'Invoiced'
            const canCancel = !!onCancel && shipment.status === 'Sent'
            const first = shipment.items[0]
            const showAmount = shipment.status === 'Invoiced' || shipment.status === 'Paid'

            return (
              <TableRow key={shipment.id}>
                <TableCell className="font-medium">#{shipment.id}</TableCell>
                {!hideTechnician && <TableCell>{shipment.technician_name || '-'}</TableCell>}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{first?.component_name || '-'}</span>
                    {shipment.item_count > 1 && (
                      <Badge variant="outline">+{shipment.item_count - 1}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{t(`partShipments.method.${shipment.shipping_method}`)}</div>
                    {shipment.tracking_code && (
                      <div className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {shipment.tracking_code}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <FormattedDate date={shipment.sent_on} format="YYYY/MM/DD" />
                </TableCell>
                <TableCell>
                  <PartShipmentStatusBadge status={shipment.status} />
                </TableCell>
                <TableCell>{showAmount ? money.withUnit(shipment.invoice_total) : '-'}</TableCell>
                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                      <span className="sr-only">{t('common.openMenu')}</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(shipment)}>
                        <Eye className="me-2 h-4 w-4" />
                        {t('common.view')}
                      </DropdownMenuItem>
                      {canReceive && (
                        <DropdownMenuItem
                          onClick={() => onReceive!(shipment)}
                          className="text-blue-600"
                        >
                          <PackageCheck className="me-2 h-4 w-4" />
                          {t('partShipments.action.receive')}
                        </DropdownMenuItem>
                      )}
                      {canInvoice && (
                        <DropdownMenuItem
                          onClick={() => onInvoice!(shipment)}
                          className="text-purple-600"
                        >
                          <Receipt className="me-2 h-4 w-4" />
                          {t('partShipments.action.invoice')}
                        </DropdownMenuItem>
                      )}
                      {canPay && (
                        <DropdownMenuItem
                          onClick={() => onPay!(shipment)}
                          className="text-emerald-600"
                        >
                          <Wallet className="me-2 h-4 w-4" />
                          {t('partShipments.action.pay')}
                        </DropdownMenuItem>
                      )}
                      {canReject && (
                        <DropdownMenuItem
                          onClick={() => onReject!(shipment)}
                          className="text-red-600"
                        >
                          <XCircle className="me-2 h-4 w-4" />
                          {t('partShipments.action.reject')}
                        </DropdownMenuItem>
                      )}
                      {canCancel && (
                        <DropdownMenuItem
                          onClick={() => onCancel!(shipment)}
                          className="text-orange-600"
                        >
                          <Ban className="me-2 h-4 w-4" />
                          {t('partShipments.action.cancel')}
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(shipment)}
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
