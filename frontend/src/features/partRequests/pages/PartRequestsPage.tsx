import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
import { Search, RefreshCw, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { PartRequestTable } from '../components/PartRequestTable'
import { PartRequestViewDialog } from '../components/PartRequestViewDialog'
import { PartRequestStatusDialog } from '../components/PartRequestStatusDialog'
import { PartRequestDeleteDialog } from '../components/PartRequestDeleteDialog'
import { partRequestService } from '../api/partRequests'
import { PartRequest, PartRequestStatus, PART_REQUEST_STATUSES } from '../types'
import { technicianService } from '@/features/technicians/api/technicians'

export function PartRequestsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [technicianFilter, setTechnicianFilter] = useState('all')

  const [selectedRequest, setSelectedRequest] = useState<PartRequest | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState<PartRequestStatus | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-list-for-part-requests'],
    queryFn: () => technicianService.list(1, 100).then((r) => r.technicians),
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['part-requests', page, limit, debouncedSearch, statusFilter, technicianFilter],
    queryFn: () =>
      partRequestService.list(
        page,
        limit,
        statusFilter,
        debouncedSearch,
        technicianFilter !== 'all' ? Number(technicianFilter) : undefined
      ),
  })

  const { data: counts } = useQuery({
    queryKey: ['part-requests-status-counts'],
    queryFn: () => partRequestService.statusCounts(),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['part-requests'] })
    queryClient.invalidateQueries({ queryKey: ['part-requests-status-counts'] })
  }

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number
      status: PartRequestStatus
      notes?: string
    }) => partRequestService.updateStatus(id, { status, notes }),
    onSuccess: () => {
      invalidateAll()
      toast.success(t('partRequests.statusUpdateSuccess'))
      setTargetStatus(null)
      setSelectedRequest(null)
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || t('partRequests.statusUpdateError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partRequestService.delete(id),
    onSuccess: () => {
      invalidateAll()
      toast.success(t('partRequests.deleteSuccess'))
      setIsDeleteOpen(false)
      setSelectedRequest(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common.error')),
  })

  const handleStatusConfirm = async (notes: string) => {
    if (selectedRequest && targetStatus) {
      await statusMutation.mutateAsync({
        id: selectedRequest.id,
        status: targetStatus,
        notes: notes || undefined,
      })
    }
  }

  const handleDelete = async () => {
    if (selectedRequest) await deleteMutation.mutateAsync(selectedRequest.id)
  }

  const resetFilters = () => {
    setStatusFilter('all')
    setTechnicianFilter('all')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('partRequests.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('partRequests.subtitle')}</p>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(value: string) => {
          setStatusFilter(value || 'all')
          setPage(1)
        }}
      >
        <TabsList>
          <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
          {PART_REQUEST_STATUSES.map((status) => (
            <TabsTrigger key={status} value={status} className="gap-1.5">
              {t(`partRequests.status.${status}`)}
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
            placeholder={t('partRequests.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>

        <Select
          items={[
            { value: 'all', label: t('partRequests.allTechnicians') },
            ...technicians.map((tech) => ({ value: String(tech.id), label: tech.full_name })),
          ]}
          value={technicianFilter}
          onValueChange={(value) => {
            setTechnicianFilter(value ?? 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('partRequests.table.technician')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('partRequests.allTechnicians')}</SelectItem>
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

      <PartRequestTable
        requests={data?.requests || []}
        onView={(request) => {
          setSelectedRequest(request)
          setIsViewOpen(true)
        }}
        onStatusChange={(request, status) => {
          setSelectedRequest(request)
          setTargetStatus(status)
        }}
        onDelete={(request) => {
          setSelectedRequest(request)
          setIsDeleteOpen(true)
        }}
        isLoading={isLoading}
      />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: Math.min((data.page - 1) * data.limit + 1, data.total),
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('partRequests.entity'),
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

      <PartRequestViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        request={selectedRequest}
      />

      <PartRequestStatusDialog
        open={targetStatus !== null}
        onOpenChange={(open) => !open && setTargetStatus(null)}
        request={selectedRequest}
        status={targetStatus}
        onConfirm={handleStatusConfirm}
        isLoading={statusMutation.isPending}
      />

      <PartRequestDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        request={selectedRequest}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
