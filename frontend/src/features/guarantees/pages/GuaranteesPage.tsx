import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, RefreshCw, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { GuaranteeTable } from '../components/GuaranteeTable'
import { GuaranteeDeleteDialog } from '../components/GuaranteeDeleteDialog'
import { ApproveDialog } from '../components/ApproveDialog'
import { RenewDialog } from '../components/RenewDialog'
import { GuaranteeViewDialog } from '../components/GuaranteeViewDialog'
import { AdminGuaranteeForm } from '../components/AdminGuaranteeForm'
import { SetGoldenDialog } from '../components/SetGoldenDialog'
import { RemoveGoldenDialog } from '../components/RemoveGoldenDialog'
import { guaranteeService } from '../api/guarantees'
import { Guarantee, GUARANTEE_STATUSES, SetGoldenData } from '../types'
import { customerService } from '@/features/customers/api/customers'
import { productService } from '@/features/products/api/products'
import { queryClient, invalidateDashboard } from '@/lib/query-client'

export function GuaranteesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')

  const [selectedGuarantee, setSelectedGuarantee] = useState<Guarantee | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isRenewOpen, setIsRenewOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [approveAction, setApproveAction] = useState<'approve' | 'reject'>('approve')
  const [isSetGoldenOpen, setIsSetGoldenOpen] = useState(false)
  const [isRemoveGoldenOpen, setIsRemoveGoldenOpen] = useState(false)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list-for-filter'],
    queryFn: () => customerService.list(1, 100).then(r => r.customers),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products-list-for-filter'],
    queryFn: () => productService.list(1, 100).then(r => r.products),
  })

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guarantees', page, limit, debouncedSearch, statusFilter, tierFilter, customerFilter, productFilter],
    queryFn: () =>
      guaranteeService.list(
        page, limit, debouncedSearch,
        statusFilter !== 'all' ? statusFilter : '',
        customerFilter !== 'all' ? Number(customerFilter) : undefined,
        productFilter !== 'all' ? Number(productFilter) : undefined,
        tierFilter !== 'all' ? tierFilter : undefined,
      ),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['guarantees'] })
    invalidateDashboard()
  }

  const adminCreateMutation = useMutation({
    mutationFn: guaranteeService.adminCreate,
    onSuccess: () => { invalidateAll(); toast.success('Guarantee created successfully'); setIsFormOpen(false) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create guarantee'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => guaranteeService.update(id, data),
    onSuccess: () => { invalidateAll(); toast.success('Guarantee updated successfully'); setIsFormOpen(false); setSelectedGuarantee(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update guarantee'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: 'Approved' | 'Rejected'; notes?: string }) =>
      guaranteeService.approve(id, status, notes),
    onSuccess: () => {
      invalidateAll()
      toast.success(`Guarantee ${approveAction === 'approve' ? 'approved' : 'rejected'} successfully`)
      setIsApproveOpen(false); setSelectedGuarantee(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to process guarantee'),
  })

  const renewMutation = useMutation({
    mutationFn: ({ id, newExpiryDate, notes }: { id: number; newExpiryDate: string; notes?: string }) =>
      guaranteeService.renew(id, newExpiryDate, notes),
    onSuccess: () => { invalidateAll(); toast.success('Guarantee renewed successfully'); setIsRenewOpen(false); setSelectedGuarantee(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to renew guarantee'),
  })

  const cancelMutation = useMutation({
    mutationFn: guaranteeService.cancel,
    onSuccess: () => { invalidateAll(); toast.success('Guarantee cancelled successfully'); setSelectedGuarantee(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to cancel guarantee'),
  })

  const deleteMutation = useMutation({
    mutationFn: guaranteeService.delete,
    onSuccess: () => { invalidateAll(); toast.success('Guarantee deleted successfully'); setIsDeleteOpen(false); setSelectedGuarantee(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete guarantee'),
  })

  const setGoldenMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SetGoldenData }) =>
      guaranteeService.setGolden(id, data),
    onSuccess: () => { invalidateAll(); toast.success('Guarantee set to golden successfully'); setIsSetGoldenOpen(false); setSelectedGuarantee(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to set golden'),
  })

  const removeGoldenMutation = useMutation({
    mutationFn: guaranteeService.removeGolden,
    onSuccess: () => { invalidateAll(); toast.success('Golden status removed'); setIsRemoveGoldenOpen(false); setSelectedGuarantee(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to remove golden'),
  })

  const handleCreate = async (data: any) => { await adminCreateMutation.mutateAsync(data) }
  const handleUpdate = async (data: any) => { if (selectedGuarantee) await updateMutation.mutateAsync({ id: selectedGuarantee.id, data }) }
  const handleApprove = async (data: any) => { if (selectedGuarantee) await approveMutation.mutateAsync({ id: selectedGuarantee.id, status: data.status, notes: data.notes }) }
  const handleRenew = async (data: any) => { if (selectedGuarantee) await renewMutation.mutateAsync({ id: selectedGuarantee.id, newExpiryDate: data.new_expiry_date, notes: data.notes }) }
  const handleCancel = async () => { if (selectedGuarantee) await cancelMutation.mutateAsync(selectedGuarantee.id) }
  const handleDelete = async () => { if (selectedGuarantee) await deleteMutation.mutateAsync(selectedGuarantee.id) }
  const handleSetGolden = async (data: SetGoldenData) => {
    if (selectedGuarantee) await setGoldenMutation.mutateAsync({ id: selectedGuarantee.id, data })
  }
  const handleRemoveGolden = async () => { if (selectedGuarantee) await removeGoldenMutation.mutateAsync(selectedGuarantee.id) }

  const openApproveDialog = (g: Guarantee, action: 'approve' | 'reject') => { setSelectedGuarantee(g); setApproveAction(action); setIsApproveOpen(true) }

  const resetFilters = () => { setStatusFilter('all'); setTierFilter('all'); setCustomerFilter('all'); setProductFilter('all'); setSearch(''); setPage(1) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('guarantees.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('guarantees.subtitle')}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="me-2 h-4 w-4" /> {t('guarantees.create')}
        </Button>
      </div>

      <Tabs value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="all">{t('guarantees.tabs.all')}</TabsTrigger>
          <TabsTrigger value="golden">{t('guarantees.tabs.golden')}</TabsTrigger>
          <TabsTrigger value="normal">{t('guarantees.tabs.normal')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder={t('guarantees.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
        </div>

        <Select
          items={[{ value: 'all', label: t('guarantees.allStatus') }, ...GUARANTEE_STATUSES.map(s => ({ value: s, label: s }))]}
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(1) }}
        >
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('guarantees.allStatus')}</SelectItem>
            {GUARANTEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          items={[{ value: 'all', label: t('guarantees.allCustomers') }, ...customers.map(c => ({ value: String(c.id), label: c.full_name }))]}
          value={customerFilter}
          onValueChange={(v) => { setCustomerFilter(v ?? 'all'); setPage(1) }}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('guarantees.table.customer')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('guarantees.allCustomers')}</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          items={[{ value: 'all', label: t('guarantees.allProducts') }, ...products.map(p => ({ value: String(p.id), label: p.name }))]}
          value={productFilter}
          onValueChange={(v) => { setProductFilter(v ?? 'all'); setPage(1) }}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('guarantees.table.product')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('guarantees.allProducts')}</SelectItem>
            {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => refetch()} size="icon"><RefreshCw className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={resetFilters} size="sm">
          <Filter className="h-4 w-4 mr-2" /> {t('common.reset')}
        </Button>
      </div>

      <GuaranteeTable
        guarantees={data?.guarantees || []}
        onView={(g) => { setSelectedGuarantee(g); setIsViewOpen(true) }}
        onEdit={(g) => { setSelectedGuarantee(g); setIsFormOpen(true) }}
        onApprove={(g) => openApproveDialog(g, 'approve')}
        onReject={(g) => openApproveDialog(g, 'reject')}
        onRenew={(g) => { setSelectedGuarantee(g); setIsRenewOpen(true) }}
        onCancel={(g) => {
          setSelectedGuarantee(g)
          if (confirm(t('guarantees.cancelConfirm', { code: g.code, customer: g.customer_name }))) handleCancel()
        }}
        onDelete={(g) => { setSelectedGuarantee(g); setIsDeleteOpen(true) }}
        onSetGolden={(g) => { setSelectedGuarantee(g); setIsSetGoldenOpen(true) }}
        onRemoveGolden={(g) => { setSelectedGuarantee(g); setIsRemoveGoldenOpen(true) }}
        isLoading={isLoading}
      />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: ((data.page - 1) * data.limit) + 1,
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('guarantees.entity'),
            })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>{t('common.previous')}</Button>
            <Button variant="outline" disabled={data.page >= data.last_page} onClick={() => setPage(data.page + 1)}>{t('common.next')}</Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AdminGuaranteeForm open={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleCreate} isLoading={adminCreateMutation.isPending} />
      <GuaranteeDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} guarantee={selectedGuarantee} onConfirm={handleDelete} isLoading={deleteMutation.isPending} />
      <ApproveDialog open={isApproveOpen} onOpenChange={setIsApproveOpen} guarantee={selectedGuarantee} action={approveAction} onConfirm={handleApprove} isLoading={approveMutation.isPending} />
      <RenewDialog open={isRenewOpen} onOpenChange={setIsRenewOpen} guarantee={selectedGuarantee} onConfirm={handleRenew} isLoading={renewMutation.isPending} />
      <GuaranteeViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} guarantee={selectedGuarantee} />
      <SetGoldenDialog open={isSetGoldenOpen} onOpenChange={setIsSetGoldenOpen} guarantee={selectedGuarantee} onConfirm={handleSetGolden} isLoading={setGoldenMutation.isPending} />
      <RemoveGoldenDialog open={isRemoveGoldenOpen} onOpenChange={setIsRemoveGoldenOpen} guarantee={selectedGuarantee} onConfirm={handleRemoveGolden} isLoading={removeGoldenMutation.isPending} />
    </div>
  )
}