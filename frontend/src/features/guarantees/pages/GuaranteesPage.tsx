// frontend/src/features/guarantees/pages/GuaranteesPage.tsx

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
import { Plus, Search, RefreshCw, Filter, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { GuaranteeTable } from '../components/GuaranteeTable'
import { GuaranteeDeleteDialog } from '../components/GuaranteeDeleteDialog'
import { ApproveDialog } from '../components/ApproveDialog'
import { RenewDialog } from '../components/RenewDialog'
import { GuaranteeViewDialog } from '../components/GuaranteeViewDialog'
import { AdminGuaranteeForm } from '../components/AdminGuaranteeForm'
import { guaranteeService } from '../api/guarantees'
import { Guarantee, GUARANTEE_STATUSES } from '../types'
import { customerService } from '@/features/customers/api/customers'
import { productService } from '@/features/products/api/products'
import { queryClient, invalidateDashboard } from '@/lib/query-client'

export function GuaranteesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [selectedGuarantee, setSelectedGuarantee] = useState<Guarantee | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isRenewOpen, setIsRenewOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<'approve' | 'reject'>('approve')

  // Fetch data for filters
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list-for-filter'],
    queryFn: () => customerService.list(1, 100).then(r => r.customers),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products-list-for-filter'],
    queryFn: () => productService.list(1, 100).then(r => r.products),
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch guarantees
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guarantees', page, limit, debouncedSearch, statusFilter, customerFilter, productFilter],
    queryFn: () =>
      guaranteeService.list(
        page,
        limit,
        debouncedSearch,
        statusFilter !== 'all' ? statusFilter : '',
        customerFilter !== 'all' ? Number(customerFilter) : undefined,
        productFilter !== 'all' ? Number(productFilter) : undefined
      ),
  })

  // Admin create mutation (this handles both existing and new customers)
  const adminCreateMutation = useMutation({
    mutationFn: guaranteeService.adminCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guarantees'] })
      invalidateDashboard()
      toast.success('Guarantee created successfully')
      setIsFormOpen(false)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create guarantee'),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => guaranteeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guarantees'] })
      invalidateDashboard()
      toast.success('Guarantee updated successfully')
      setIsFormOpen(false)
      setSelectedGuarantee(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update guarantee'),
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: 'Approved' | 'Rejected'; notes?: string }) =>
      guaranteeService.approve(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guarantees'] })
      invalidateDashboard()
      toast.success(`Guarantee ${approveAction === 'approve' ? 'approved' : 'rejected'} successfully`)
      setIsApproveOpen(false)
      setSelectedGuarantee(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to process guarantee'),
  })

  // Renew mutation
  const renewMutation = useMutation({
    mutationFn: ({ id, newExpiryDate, notes }: { id: number; newExpiryDate: string; notes?: string }) =>
      guaranteeService.renew(id, newExpiryDate, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guarantees'] })
      invalidateDashboard()
      toast.success('Guarantee renewed successfully')
      setIsRenewOpen(false)
      setSelectedGuarantee(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to renew guarantee'),
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: guaranteeService.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guarantees'] })
      invalidateDashboard()
      toast.success('Guarantee cancelled successfully')
      setSelectedGuarantee(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to cancel guarantee'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: guaranteeService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guarantees'] })
      invalidateDashboard()
      toast.success('Guarantee deleted successfully')
      setIsDeleteOpen(false)
      setSelectedGuarantee(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete guarantee'),
  })

  // Handlers
  const handleCreate = async (data: any) => {
    await adminCreateMutation.mutateAsync(data)
  }

  const handleUpdate = async (data: any) => {
    if (selectedGuarantee) {
      await updateMutation.mutateAsync({ id: selectedGuarantee.id, data })
    }
  }

  const handleApprove = async (data: any) => {
    if (selectedGuarantee) {
      await approveMutation.mutateAsync({
        id: selectedGuarantee.id,
        status: data.status,
        notes: data.notes,
      })
    }
  }

  const handleRenew = async (data: any) => {
    if (selectedGuarantee) {
      await renewMutation.mutateAsync({
        id: selectedGuarantee.id,
        newExpiryDate: data.new_expiry_date,
        notes: data.notes,
      })
    }
  }

  const handleCancel = async () => {
    if (selectedGuarantee) {
      await cancelMutation.mutateAsync(selectedGuarantee.id)
    }
  }

  const handleDelete = async () => {
    if (selectedGuarantee) {
      await deleteMutation.mutateAsync(selectedGuarantee.id)
    }
  }

  const openApproveDialog = (guarantee: Guarantee, action: 'approve' | 'reject') => {
    setSelectedGuarantee(guarantee)
    setApproveAction(action)
    setIsApproveOpen(true)
  }

  const resetFilters = () => {
    setStatusFilter('all')
    setCustomerFilter('all')
    setProductFilter('all')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Guarantees</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product guarantees and warranties
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Guarantee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by code, customer, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {GUARANTEE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={customerFilter} onValueChange={(value) => { setCustomerFilter(value ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productFilter} onValueChange={(value) => { setProductFilter(value ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(limit)} onValueChange={(value) => { setLimit(Number(value)); setPage(1) }}>
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
          <Filter className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Table */}
      <GuaranteeTable
        guarantees={data?.guarantees || []}
        onView={(g) => { setSelectedGuarantee(g); setIsViewOpen(true) }}
        onEdit={(g) => { setSelectedGuarantee(g); setIsFormOpen(true) }}
        onApprove={(g) => openApproveDialog(g, 'approve')}
        onReject={(g) => openApproveDialog(g, 'reject')}
        onRenew={(g) => { setSelectedGuarantee(g); setIsRenewOpen(true) }}
        onCancel={(g) => { 
          setSelectedGuarantee(g)
          if (confirm(`Are you sure you want to cancel ${g.code} for ${g.customer_name}?`)) {
            handleCancel()
          }
        }}
        onDelete={(g) => { setSelectedGuarantee(g); setIsDeleteOpen(true) }}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((data.page - 1) * data.limit) + 1} to{' '}
            {Math.min(data.page * data.limit, data.total)} of {data.total} guarantees
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

      {/* Dialogs - Only AdminGuaranteeForm, no regular GuaranteeForm */}
      <AdminGuaranteeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isLoading={adminCreateMutation.isPending}
      />

      <GuaranteeDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        guarantee={selectedGuarantee}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <ApproveDialog
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        guarantee={selectedGuarantee}
        action={approveAction}
        onConfirm={handleApprove}
        isLoading={approveMutation.isPending}
      />

      <RenewDialog
        open={isRenewOpen}
        onOpenChange={setIsRenewOpen}
        guarantee={selectedGuarantee}
        onConfirm={handleRenew}
        isLoading={renewMutation.isPending}
      />

      <GuaranteeViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        guarantee={selectedGuarantee}
      />
    </div>
  )
}