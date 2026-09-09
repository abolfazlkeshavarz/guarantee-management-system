import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
import { Plus, Search, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { CustomerTable } from '../components/CustomerTable'
import { CustomerViewDialog } from '../components/CustomerViewDialog'
import { CustomerForm } from '../components/CustomerForm'
import { CustomerDeleteDialog } from '../components/CustomerDeleteDialog'
import { CustomerExportDialog } from '../components/CustomerExportDialog'
import { customerService } from '../api/customers'
import { Customer } from '../types'
import { invalidateDashboard } from '@/lib/query-client'

export function CustomersPage() {
  const { t } = useTranslation()
  const { canDelete } = usePermissions()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  // Fetch customers
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', page, limit, debouncedSearch],
    queryFn: () => customerService.list(page, limit, debouncedSearch),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      invalidateDashboard()
      toast.success(t('toasts.customerCreated'))
      setIsFormOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('toasts.customerCreateFailed'))
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      invalidateDashboard()
      toast.success(t('toasts.customerUpdated'))
      setIsFormOpen(false)
      setSelectedCustomer(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('toasts.customerUpdateFailed'))
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: customerService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      invalidateDashboard()
      toast.success(t('toasts.customerDeleted'))
      setIsDeleteOpen(false)
      setSelectedCustomer(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('toasts.customerDeleteFailed'))
    },
  })

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data)
  }

  const handleUpdate = async (data: any) => {
    if (selectedCustomer) {
      await updateMutation.mutateAsync({ id: selectedCustomer.id, data })
    }
  }

  const handleDelete = async () => {
    if (selectedCustomer) {
      await deleteMutation.mutateAsync(selectedCustomer.id)
    }
  }

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeleteOpen(true)
  }

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsViewOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">{t('customers.title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsExportOpen(true)}>
            <Download className="me-2 h-4 w-4" />
            {t('exports.export')}
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('customers.add')}
          </Button>
        </div>
      </div>

      <CustomerExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} />

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('customers.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>
        <Select
          value={String(limit)}
          onValueChange={(value) => {
            setLimit(Number(value))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <CustomerTable
        customers={data?.customers || []}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={canDelete ? handleDeleteClick : undefined}
        isLoading={isLoading}
      />

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: ((data.page - 1) * data.limit) + 1,
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('customers.title'),
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

      <CustomerViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        customer={selectedCustomer}
      />

      <CustomerForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={selectedCustomer}
        onSubmit={selectedCustomer ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <CustomerDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        customer={selectedCustomer}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}