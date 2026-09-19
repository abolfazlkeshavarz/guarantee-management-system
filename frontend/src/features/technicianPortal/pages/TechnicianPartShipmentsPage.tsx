import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, RefreshCw, Truck, Clock, Receipt, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { technicianPartShipmentService } from '@/features/partShipments/api/partShipments'
import { PART_SHIPMENT_STATUSES, PartShipment } from '@/features/partShipments/types'
import { PartShipmentTable } from '@/features/partShipments/components/PartShipmentTable'
import { PartShipmentViewDialog } from '@/features/partShipments/components/PartShipmentViewDialog'
import { useMoney } from '@/features/partShipments/hooks/useMoney'
import { NewPartShipmentDialog } from '../components/NewPartShipmentDialog'

export function TechnicianPartShipmentsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const queryClient = useQueryClient()
  const money = useMoney()

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewShipment, setViewShipment] = useState<PartShipment | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-part-shipments', page, limit, statusFilter],
    queryFn: () => technicianPartShipmentService.list(page, limit, statusFilter),
  })

  const { data: summary } = useQuery({
    queryKey: ['my-part-shipments-summary'],
    queryFn: () => technicianPartShipmentService.summary(),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => technicianPartShipmentService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-part-shipments'] })
      queryClient.invalidateQueries({ queryKey: ['my-part-shipments-summary'] })
      queryClient.invalidateQueries({ queryKey: ['shippable-parts'] })
      toast.success(t('partShipments.cancelSuccess'))
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common.error')),
  })

  const awaiting = summary?.awaiting_count ?? 0
  const inTransit = summary?.counts?.Sent ?? 0

  const stats = [
    {
      title: t('partShipments.stats.awaiting'),
      value: String(awaiting),
      icon: Clock,
      color: awaiting > 0 ? 'text-amber-600' : 'text-gray-400',
    },
    {
      title: t('partShipments.stats.inTransit'),
      value: String(inTransit),
      icon: Truck,
      color: 'text-blue-600',
    },
    {
      title: t('partShipments.stats.payable'),
      value: money.withUnit(summary?.payable_total ?? 0),
      icon: Receipt,
      color: 'text-purple-600',
    },
    {
      title: t('partShipments.stats.paid'),
      value: money.withUnit(summary?.paid_total ?? 0),
      icon: Wallet,
      color: 'text-emerald-600',
    },
  ]

  const handleCancel = (shipment: PartShipment) => {
    if (window.confirm(t('partShipments.cancelConfirm', { id: shipment.id }))) {
      cancelMutation.mutate(shipment.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold text-gray-900">{t('partShipments.myTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('partShipments.mySubtitle')}</p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Truck className="h-4 w-4" />
          {t('partShipments.newShipment')}
        </Button>
      </div>

      {awaiting > 0 && (
        <div
          className={`flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">
                {t('partShipments.awaitingTitle', { count: awaiting })}
              </p>
              <p className="text-sm text-amber-800">{t('partShipments.awaitingDesc')}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsFormOpen(true)} className="shrink-0">
            {t('partShipments.sendNow')}
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader
                className={`flex flex-row items-center justify-between space-y-0 pb-2 ${
                  isRTL ? 'flex-row-reverse' : ''
                }`}
              >
                <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader
          className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <CardTitle>{t('partShipments.myTableTitle')}</CardTitle>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Select
              items={[
                { value: 'all', label: t('partShipments.allStatuses') },
                ...PART_SHIPMENT_STATUSES.map((status) => ({
                  value: status,
                  label: t(`partShipments.status.${status}`),
                })),
              ]}
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                const next = value || 'all'
                setStatusFilter(next === 'all' ? '' : next)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isRTL ? 'text-right' : ''}>
                <SelectItem value="all">{t('partShipments.allStatuses')}</SelectItem>
                {PART_SHIPMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`partShipments.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch()
                queryClient.invalidateQueries({ queryKey: ['my-part-shipments-summary'] })
              }}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'me-2'}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PartShipmentTable
            shipments={data?.shipments || []}
            hideTechnician
            onView={(shipment) => setViewShipment(shipment)}
            onCancel={handleCancel}
            isLoading={isLoading}
          />

          {data && data.total > 0 && (
            <div
              className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <p className="text-sm text-gray-500">
                {t('common.showingRange', {
                  from: Math.min((data.page - 1) * data.limit + 1, data.total),
                  to: Math.min(data.page * data.limit, data.total),
                  total: data.total,
                  entity: t('partShipments.entity'),
                })}
              </p>
              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
        </CardContent>
      </Card>

      <NewPartShipmentDialog open={isFormOpen} onOpenChange={setIsFormOpen} />

      <PartShipmentViewDialog
        open={!!viewShipment}
        onOpenChange={(open) => !open && setViewShipment(null)}
        shipment={viewShipment}
      />
    </div>
  )
}
