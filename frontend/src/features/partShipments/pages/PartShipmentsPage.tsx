import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Search, RefreshCw, Filter, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { technicianService } from '@/features/technicians/api/technicians'
import { partShipmentService } from '../api/partShipments'
import { PART_SHIPMENT_STATUSES, PartShipment } from '../types'
import { PartShipmentTable } from '../components/PartShipmentTable'
import { PartShipmentViewDialog } from '../components/PartShipmentViewDialog'
import { PartShipmentReceiveDialog } from '../components/PartShipmentReceiveDialog'
import { PartShipmentRejectDialog } from '../components/PartShipmentRejectDialog'
import { PartShipmentDeleteDialog } from '../components/PartShipmentDeleteDialog'

type ActiveDialog = 'view' | 'receive' | 'reject' | 'delete' | null

/**
 * The parcel's journey: what technicians sent, what arrived, what was turned
 * away. Pricing and payment live on the Finance screen - a warehouse decision
 * and a money decision are made by different people at different moments.
 */
export function PartShipmentsPage() {
  const { t } = useTranslation()
  const { canDelete } = usePermissions()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [technicianFilter, setTechnicianFilter] = useState('all')

  const [selected, setSelected] = useState<PartShipment | null>(null)
  const [dialog, setDialog] = useState<ActiveDialog>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-list-for-part-shipments'],
    queryFn: () => technicianService.list(1, 100).then((r) => r.technicians),
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['part-shipments', page, limit, debouncedSearch, statusFilter, technicianFilter],
    queryFn: () =>
      partShipmentService.list(
        page,
        limit,
        statusFilter,
        debouncedSearch,
        technicianFilter !== 'all' ? Number(technicianFilter) : undefined
      ),
  })

  const { data: summary } = useQuery({
    queryKey: ['part-shipments-summary'],
    queryFn: () => partShipmentService.summary(),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['part-shipments'] })
    queryClient.invalidateQueries({ queryKey: ['part-shipments-summary'] })
    // Receiving a parcel creates work for finance, so its figures move too.
    queryClient.invalidateQueries({ queryKey: ['part-shipments-finance'] })
  }

  const close = () => {
    setDialog(null)
    setSelected(null)
  }
  const onError = (error: any) => toast.error(error.response?.data?.message || t('common.error'))

  const receiveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof partShipmentService.receive>[1]) =>
      partShipmentService.receive(selected!.id, payload),
    onSuccess: () => {
      invalidateAll()
      toast.success(t('partShipments.receive.success'))
      close()
    },
    onError,
  })

  const rejectMutation = useMutation({
    mutationFn: (notes: string) => partShipmentService.reject(selected!.id, notes),
    onSuccess: () => {
      invalidateAll()
      toast.success(t('partShipments.reject.success'))
      close()
    },
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: () => partShipmentService.delete(selected!.id),
    onSuccess: () => {
      invalidateAll()
      toast.success(t('partShipments.deleteSuccess'))
      close()
    },
    onError,
  })

  const open = (shipment: PartShipment, next: ActiveDialog) => {
    setSelected(shipment)
    setDialog(next)
  }

  const resetFilters = () => {
    setStatusFilter('all')
    setTechnicianFilter('all')
    setSearch('')
    setPage(1)
  }

  const counts = summary?.counts
  const awaitingInvoice = counts?.Received ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('partShipments.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('partShipments.subtitle')}</p>
      </div>

      {/* A received parcel is finance's problem from here on, so point at that
          screen rather than duplicating the invoice action here. */}
      {awaitingInvoice > 0 && (
        <Link
          to="/finance"
          className="flex items-center justify-between gap-4 rounded-lg border border-purple-300 bg-purple-50 p-4 hover:bg-purple-100 transition-colors"
        >
          <p className="text-sm font-medium text-purple-900">
            {t('partShipments.awaitingInvoiceHint', { count: awaitingInvoice })}
          </p>
          <span className="flex items-center gap-1 text-sm font-medium text-purple-700 shrink-0">
            {t('finance.goToFinance')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </span>
        </Link>
      )}

      <Tabs
        value={statusFilter}
        onValueChange={(value: string) => {
          setStatusFilter(value || 'all')
          setPage(1)
        }}
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
          {PART_SHIPMENT_STATUSES.map((status) => (
            <TabsTrigger key={status} value={status} className="gap-1.5">
              {t(`partShipments.status.${status}`)}
              {!!counts && counts[status] > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {counts[status]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('partShipments.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>

        <Select
          items={[
            { value: 'all', label: t('partShipments.allTechnicians') },
            ...technicians.map((tech) => ({ value: String(tech.id), label: tech.full_name })),
          ]}
          value={technicianFilter}
          onValueChange={(value) => {
            setTechnicianFilter(value ?? 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('partShipments.table.technician')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('partShipments.allTechnicians')}</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={String(tech.id)}>
                {tech.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(limit)}
          onValueChange={(value) => {
            setLimit(Number(value))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => refetch()} size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={resetFilters} size="sm">
          <Filter className="h-4 w-4 me-2" />
          {t('common.reset')}
        </Button>
      </div>

      <PartShipmentTable
        shipments={data?.shipments || []}
        onView={(s) => open(s, 'view')}
        onReceive={(s) => open(s, 'receive')}
        onReject={(s) => open(s, 'reject')}
        onDelete={canDelete ? (s) => open(s, 'delete') : undefined}
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

      <PartShipmentViewDialog
        open={dialog === 'view'}
        onOpenChange={(o) => !o && close()}
        shipment={selected}
      />
      <PartShipmentReceiveDialog
        open={dialog === 'receive'}
        onOpenChange={(o) => !o && close()}
        shipment={selected}
        onConfirm={async (d) => {
          await receiveMutation.mutateAsync(d).catch(() => undefined)
        }}
        isLoading={receiveMutation.isPending}
      />
      <PartShipmentRejectDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && close()}
        shipment={selected}
        onConfirm={async (notes) => {
          await rejectMutation.mutateAsync(notes).catch(() => undefined)
        }}
        isLoading={rejectMutation.isPending}
      />
      <PartShipmentDeleteDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => !o && close()}
        shipment={selected}
        onConfirm={async () => {
          await deleteMutation.mutateAsync().catch(() => undefined)
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
