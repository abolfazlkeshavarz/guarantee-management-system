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
import { RefreshCw, PackageCheck, Clock, Truck, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { NewPartRequestDialog } from '../components/NewPartRequestDialog'
import { PartRequestTable } from '@/features/partRequests/components/PartRequestTable'
import { PartRequestViewDialog } from '@/features/partRequests/components/PartRequestViewDialog'
import { technicianPartRequestService } from '@/features/partRequests/api/partRequests'
import { PartRequest, PART_REQUEST_STATUSES } from '@/features/partRequests/types'

export function TechnicianPartRequestsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewRequest, setViewRequest] = useState<PartRequest | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-part-requests', page, limit, statusFilter],
    queryFn: () => technicianPartRequestService.list(page, limit, statusFilter),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => technicianPartRequestService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-part-requests'] })
      toast.success(t('partRequests.cancelSuccess'))
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common.error')),
  })

  const requests = data?.requests || []
  const total = data?.total || 0
  const pending = requests.filter((r) => r.status === 'Pending').length
  const awaiting = requests.filter(
    (r) => r.status === 'Approved' || r.status === 'NotDelivered'
  ).length
  const delivered = requests.filter((r) => r.status === 'Delivered').length

  const stats = [
    { title: t('partRequests.stats.total'), value: total, icon: PackagePlus, color: 'text-blue-600' },
    {
      title: t('partRequests.stats.pending'),
      value: pending,
      icon: Clock,
      color: 'text-yellow-600',
    },
    { title: t('partRequests.stats.awaiting'), value: awaiting, icon: Truck, color: 'text-blue-600' },
    {
      title: t('partRequests.stats.delivered'),
      value: delivered,
      icon: PackageCheck,
      color: 'text-emerald-600',
    },
  ]

  const handleCancel = (request: PartRequest) => {
    if (window.confirm(t('partRequests.cancelConfirm', { item: request.item_name }))) {
      cancelMutation.mutate(request.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold text-gray-900">{t('partRequests.myTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('partRequests.mySubtitle')}</p>
        </div>
        <NewPartRequestDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
                <div className={`text-2xl font-bold ${isRTL ? 'text-right' : ''}`}>{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader
          className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <CardTitle>{t('partRequests.myTableTitle')}</CardTitle>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Select
              items={[
                { value: 'all', label: t('partRequests.allStatuses') },
                ...PART_REQUEST_STATUSES.map((status) => ({
                  value: status,
                  label: t(`partRequests.status.${status}`),
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
                <SelectValue placeholder={t('partRequests.filterByStatus')} />
              </SelectTrigger>
              <SelectContent className={isRTL ? 'text-right' : ''}>
                <SelectItem value="all">{t('partRequests.allStatuses')}</SelectItem>
                {PART_REQUEST_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`partRequests.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'me-2'}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PartRequestTable
            requests={requests}
            hideTechnician
            onView={(request) => setViewRequest(request)}
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
                  entity: t('partRequests.entity'),
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

      <PartRequestViewDialog
        open={!!viewRequest}
        onOpenChange={(open) => !open && setViewRequest(null)}
        request={viewRequest}
      />
    </div>
  )
}
