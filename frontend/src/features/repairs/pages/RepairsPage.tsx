import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { repairService } from '../api/repairs'
import { Repair, REPAIR_STATUSES } from '../types'
import { queryClient, invalidateDashboard } from '@/lib/query-client'


export function RepairsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>('')  // Changed to string with default ''
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: repairService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] })
      invalidateDashboard()
      toast.success('Repair created successfully')
      setIsFormOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create repair')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      repairService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] })
      invalidateDashboard()
      toast.success('Repair updated successfully')
      setIsFormOpen(false)
      setSelectedRepair(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update repair')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: repairService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] })
      invalidateDashboard()
      toast.success('Repair deleted successfully')
      setIsDeleteOpen(false)
      setSelectedRepair(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete repair')
    },
  })

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data)
  }

  const handleUpdate = async (data: any) => {
    if (selectedRepair) {
      await updateMutation.mutateAsync({ id: selectedRepair.id, data })
    }
  }

  const handleDelete = async () => {
    if (selectedRepair) {
      await deleteMutation.mutateAsync(selectedRepair.id)
    }
  }

  const handleEdit = (repair: Repair) => {
    setSelectedRepair(repair)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (repair: Repair) => {
    setSelectedRepair(repair)
    setIsDeleteOpen(true)
  }

  const handleView = (repair: Repair) => {
    setSelectedRepair(repair)
    setIsViewOpen(true)
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
          <h1 className="text-3xl font-bold text-gray-900">Repairs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage repair requests and track their status
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Repair
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) => {
            setStatusFilter(value === 'all' ? '' : value ?? '')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
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
          Reset Filters
        </Button>
      </div>

      {/* Table */}
      <RepairTable
        repairs={data?.repairs || []}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {Math.min((data.page - 1) * data.limit + 1, data.total)} to{' '}
            {Math.min(data.page * data.limit, data.total)} of {data.total} repairs
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={data.page >= data.last_page}
              onClick={() => setPage(data.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <RepairForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        repair={selectedRepair}
        onSubmit={selectedRepair ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
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
    </div>
  )
}