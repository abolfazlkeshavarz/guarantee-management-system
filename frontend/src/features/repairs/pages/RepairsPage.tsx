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
import { Plus, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { RepairTable } from '../components/RepairTable'
import { RepairForm } from '../components/RepairForm'
import { RepairDeleteDialog } from '../components/RepairDeleteDialog'
import { RepairViewDialog } from '../components/RepairViewDialog'
import { RepairReviewDialog } from '../components/RepairReviewDialog'
import { RepairCancelDialog } from '../components/RepairCancelDialog'
import { repairService } from '../api/repairs'
import { Repair, REPAIR_STATUSES } from '../types'
import { invalidateDashboard } from '@/lib/query-client'


interface RepairsPageProps {
  /**
   * Admin-level verbs (create-on-behalf, delete). False for the technician
   * portal's review screen, where the API would 403 anyway.
   */
  canManage?: boolean
}

export function RepairsPage({ canManage = true }: RepairsPageProps = {}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch repairs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['repairs', page, limit, debouncedSearch, statusFilter],
    queryFn: () => repairService.list(page, limit, statusFilter),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['repairs'] })
    invalidateDashboard()
  }

  const createMutation = useMutation({
    mutationFn: repairService.create,
    onSuccess: () => {
      invalidateAll()
      toast.success('Repair created successfully')
      setIsFormOpen(false)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create repair'),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: 'Approved' | 'Rejected'; notes?: string } }) =>
      repairService.review(id, data),
    onSuccess: () => {
      invalidateAll()
      toast.success('Repair reviewed successfully')
      setReviewAction(null)
      setSelectedRepair(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to review repair'),
  })

  const cancelMutation = useMutation({
    mutationFn: repairService.cancel,
    onSuccess: () => {
      invalidateAll()
      toast.success('Repair cancelled successfully')
      setIsCancelOpen(false)
      setSelectedRepair(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to cancel repair'),
  })

  const deleteMutation = useMutation({
    mutationFn: repairService.delete,
    onSuccess: () => {
      invalidateAll()
      toast.success('Repair deleted successfully')
      setIsDeleteOpen(false)
      setSelectedRepair(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete repair'),
  })

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data)
  }

  const handleReviewConfirm = async (data: { status: 'Approved' | 'Rejected'; notes?: string }) => {
    if (selectedRepair) {
      await reviewMutation.mutateAsync({ id: selectedRepair.id, data })
    }
  }

  const handleCancelConfirm = async () => {
    if (selectedRepair) {
      await cancelMutation.mutateAsync(selectedRepair.id)
    }
  }

  const handleDelete = async () => {
    if (selectedRepair) {
      await deleteMutation.mutateAsync(selectedRepair.id)
    }
  }

  const handleView = (repair: Repair) => {
    setSelectedRepair(repair)
    setIsViewOpen(true)
  }

  const handleApprove = (repair: Repair) => {
    setSelectedRepair(repair)
    setReviewAction('approve')
  }

  const handleReject = (repair: Repair) => {
    setSelectedRepair(repair)
    setReviewAction('reject')
  }

  const handleCancelClick = (repair: Repair) => {
    setSelectedRepair(repair)
    setIsCancelOpen(true)
  }

  const handleDeleteClick = (repair: Repair) => {
    setSelectedRepair(repair)
    setIsDeleteOpen(true)
  }

  const resetFilters = () => {
    setStatusFilter('')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('repairs.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('repairs.subtitle')}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('repairs.new')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('repairs.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>

        <Select
          items={[{ value: 'all', label: t('guarantees.allStatus') }, ...REPAIR_STATUSES.map((status) => ({ value: status, label: status }))]}
          value={statusFilter || 'all'}
          onValueChange={(value) => {
            setStatusFilter(value === 'all' ? '' : value ?? '')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('guarantees.allStatus')}</SelectItem>
            {REPAIR_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
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
          {t('common.reset')}
        </Button>
      </div>

      {/* Table */}
      <RepairTable
        repairs={data?.repairs || []}
        onView={handleView}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancelClick}
        onDelete={canManage ? handleDeleteClick : undefined}
        isLoading={isLoading}
      />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: Math.min((data.page - 1) * data.limit + 1, data.total),
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('repairs.entity')
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

      {/* Dialogs */}
      <RepairForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <RepairDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        repair={selectedRepair}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <RepairViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        repair={selectedRepair}
      />

      <RepairReviewDialog
        open={reviewAction !== null}
        onOpenChange={(open) => !open && setReviewAction(null)}
        repair={selectedRepair}
        action={reviewAction || 'approve'}
        onConfirm={handleReviewConfirm}
        isLoading={reviewMutation.isPending}
      />

      <RepairCancelDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        repair={selectedRepair}
        onConfirm={handleCancelConfirm}
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}
