import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, Receipt, Wallet, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { FormattedDate } from '@/components/common/FormattedDate'
import { partShipmentService } from '@/features/partShipments/api/partShipments'
import { PartShipment } from '@/features/partShipments/types'
import { PartShipmentTable } from '@/features/partShipments/components/PartShipmentTable'
import { PartShipmentViewDialog } from '@/features/partShipments/components/PartShipmentViewDialog'
import { PartShipmentInvoiceDialog } from '@/features/partShipments/components/PartShipmentInvoiceDialog'
import { PartShipmentPayDialog } from '@/features/partShipments/components/PartShipmentPayDialog'
import { useMoney } from '@/features/partShipments/hooks/useMoney'

/** Each tab is a stage of the money, not a status list to browse. */
const STAGES = [
  { key: 'Received', labelKey: 'finance.stage.toInvoice' },
  { key: 'Invoiced', labelKey: 'finance.stage.toPay' },
  { key: 'Paid', labelKey: 'finance.stage.paid' },
] as const

type Stage = (typeof STAGES)[number]['key']
type ActiveDialog = 'view' | 'invoice' | 'pay' | null

/**
 * The money behind returned parts: price what arrived, pay the technician,
 * and see at a glance who is still owed. Split out of Part Shipments because
 * receiving a parcel and paying for it are different jobs.
 */
export function FinancePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const money = useMoney()

  const [stage, setStage] = useState<Stage>('Received')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [selected, setSelected] = useState<PartShipment | null>(null)
  const [dialog, setDialog] = useState<ActiveDialog>(null)

  const { data: finance } = useQuery({
    queryKey: ['part-shipments-finance'],
    queryFn: () => partShipmentService.finance(),
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['part-shipments', 'finance', stage, page, limit],
    queryFn: () => partShipmentService.list(page, limit, stage),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['part-shipments'] })
    queryClient.invalidateQueries({ queryKey: ['part-shipments-finance'] })
    queryClient.invalidateQueries({ queryKey: ['part-shipments-summary'] })
  }

  const close = () => {
    setDialog(null)
    setSelected(null)
  }
  const onError = (error: any) => toast.error(error.response?.data?.message || t('common.error'))

  const invoiceMutation = useMutation({
    mutationFn: (payload: Parameters<typeof partShipmentService.invoice>[1]) =>
      partShipmentService.invoice(selected!.id, payload),
    onSuccess: () => {
      invalidateAll()
      toast.success(t('partShipments.invoice.success'))
      close()
    },
    onError,
  })

  const payMutation = useMutation({
    mutationFn: (payload: Parameters<typeof partShipmentService.pay>[1]) =>
      partShipmentService.pay(selected!.id, payload),
    onSuccess: () => {
      invalidateAll()
      toast.success(t('partShipments.pay.success'))
      close()
    },
    onError,
  })

  const open = (shipment: PartShipment, next: ActiveDialog) => {
    setSelected(shipment)
    setDialog(next)
  }

  const cards = [
    {
      title: t('finance.awaitingInvoice'),
      value: String(finance?.awaiting_invoice_count ?? 0),
      hint: t('finance.awaitingInvoiceHint'),
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      title: t('finance.payable'),
      value: money.withUnit(finance?.payable_total ?? 0),
      hint: t('finance.payableHint', { count: finance?.payable_count ?? 0 }),
      icon: Receipt,
      color: 'text-purple-600',
    },
    {
      title: t('finance.paid'),
      value: money.withUnit(finance?.paid_total ?? 0),
      hint: t('finance.paidHint', { count: finance?.paid_count ?? 0 }),
      icon: Wallet,
      color: 'text-emerald-600',
    },
  ]

  const stageCount = (key: Stage) =>
    key === 'Received'
      ? (finance?.awaiting_invoice_count ?? 0)
      : key === 'Invoiced'
        ? (finance?.payable_count ?? 0)
        : (finance?.paid_count ?? 0)

  const owed = (finance?.technicians ?? []).filter((b) => b.payable > 0 || b.awaiting_invoice > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('finance.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('finance.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetch()
            queryClient.invalidateQueries({ queryKey: ['part-shipments-finance'] })
          }}
        >
          <RefreshCw className="me-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.hint}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs
        value={stage}
        onValueChange={(value: string) => {
          setStage((value as Stage) || 'Received')
          setPage(1)
        }}
      >
        <TabsList>
          {STAGES.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
              {t(s.labelKey)}
              {stageCount(s.key) > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {stageCount(s.key)}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <PartShipmentTable
        shipments={data?.shipments || []}
        onView={(s) => open(s, 'view')}
        onInvoice={stage === 'Received' ? (s) => open(s, 'invoice') : undefined}
        onPay={stage === 'Invoiced' ? (s) => open(s, 'pay') : undefined}
        isLoading={isLoading}
      />

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: Math.min((data.page - 1) * data.limit + 1, data.total),
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('partShipments.entity'),
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              disabled={data.page >= data.last_page}
              onClick={() => setPage(data.page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Who is still waiting for their money, worst first. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t('finance.balancesTitle')}</CardTitle>
          <Users className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {owed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('finance.nothingOwed')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('partShipments.table.technician')}</TableHead>
                  <TableHead>{t('finance.stage.toInvoice')}</TableHead>
                  <TableHead>{t('finance.payable')}</TableHead>
                  <TableHead>{t('finance.waitingSince')}</TableHead>
                  <TableHead>{t('finance.paidToDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owed.map((balance) => (
                  <TableRow key={balance.technician_id}>
                    <TableCell className="font-medium">{balance.technician_name || '—'}</TableCell>
                    <TableCell>
                      {balance.awaiting_invoice > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-100 text-amber-800 border-amber-200"
                        >
                          {balance.awaiting_invoice}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {balance.payable > 0 ? money.withUnit(balance.payable) : '—'}
                    </TableCell>
                    <TableCell>
                      {balance.oldest_invoice_at ? (
                        <FormattedDate date={balance.oldest_invoice_at} format="YYYY/MM/DD" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {money.withUnit(balance.paid_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PartShipmentViewDialog
        open={dialog === 'view'}
        onOpenChange={(o) => !o && close()}
        shipment={selected}
      />
      <PartShipmentInvoiceDialog
        open={dialog === 'invoice'}
        onOpenChange={(o) => !o && close()}
        shipment={selected}
        onConfirm={async (d) => {
          await invoiceMutation.mutateAsync(d).catch(() => undefined)
        }}
        isLoading={invoiceMutation.isPending}
      />
      <PartShipmentPayDialog
        open={dialog === 'pay'}
        onOpenChange={(o) => !o && close()}
        shipment={selected}
        onConfirm={async (d) => {
          await payMutation.mutateAsync(d).catch(() => undefined)
        }}
        isLoading={payMutation.isPending}
      />
    </div>
  )
}
