import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ProductTable } from '../components/ProductTable'
import { ProductForm } from '../components/ProductForm'
import { ProductDeleteDialog } from '../components/ProductDeleteDialog'
import { productService } from '../api/products'
import { Product } from '../types'
import { categoryService } from '@/features/categories/api/categories'
import { invalidateDashboard } from '@/lib/query-client'

export function ProductsPage() {
  const { t } = useTranslation()
  const { canDelete } = usePermissions()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-active'],
    queryFn: categoryService.listActive,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', page, limit, debouncedSearch, categoryFilter],
    queryFn: () => productService.list(page, limit, debouncedSearch, categoryFilter !== 'all' ? Number(categoryFilter) : undefined),
  })

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      invalidateDashboard()
      toast.success('Product created successfully')
      setIsFormOpen(false)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create product'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      invalidateDashboard()
      toast.success('Product updated successfully')
      setIsFormOpen(false)
      setSelectedProduct(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update product'),
  })

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      invalidateDashboard()
      toast.success('Product deleted successfully')
      setIsDeleteOpen(false)
      setSelectedProduct(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete product'),
  })

  const handleCreate = async (data: any) => { await createMutation.mutateAsync(data) }
  const handleUpdate = async (data: any) => {
    if (selectedProduct) await updateMutation.mutateAsync({ id: selectedProduct.id, data })
  }
  const handleDelete = async () => {
    if (selectedProduct) await deleteMutation.mutateAsync(selectedProduct.id)
  }
  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }
  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('products.title')}</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('products.add')}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder={t('products.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
        </div>
        <Select
          items={[{ value: 'all', label: t('products.allCategories') }, ...categories.map((cat) => ({ value: String(cat.id), label: cat.name }))]}
          value={categoryFilter}
          onValueChange={(value) => { setCategoryFilter(value ?? 'all'); setPage(1) }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('products.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('products.allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(limit)} onValueChange={(value) => { setLimit(Number(value)); setPage(1) }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ProductTable products={data?.products || []} onEdit={handleEdit} onDelete={canDelete ? handleDeleteClick : undefined} isLoading={isLoading} />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: ((data.page - 1) * data.limit) + 1,
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('products.entity')
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

      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
        onSubmit={selectedProduct ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
      <ProductDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        product={selectedProduct}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}