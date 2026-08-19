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
import { CategoryTable } from '../components/CategoryTable'
import { CategoryForm } from '../components/CategoryForm'
import { CategoryDeleteDialog } from '../components/CategoryDeleteDialog'
import { categoryService } from '../api/categories'
import { Category } from '../types'

export function CategoriesPage() {
  const { t } = useTranslation()
  const { canDelete } = usePermissions()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['categories', page, limit, debouncedSearch],
    queryFn: () => categoryService.list(page, limit, debouncedSearch),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['categories-active'] })
  }

  const createMutation = useMutation({
    mutationFn: categoryService.create,
    onSuccess: () => {
      invalidateAll()
      toast.success('Category created successfully')
      setIsFormOpen(false)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create category'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => categoryService.update(id, data),
    onSuccess: () => {
      invalidateAll()
      toast.success('Category updated successfully')
      setIsFormOpen(false)
      setSelectedCategory(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update category'),
  })

  const deleteMutation = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: () => {
      invalidateAll()
      toast.success('Category deleted successfully')
      setIsDeleteOpen(false)
      setSelectedCategory(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete category. Make sure no products use it.'),
  })

  const handleCreate = async (data: any) => { await createMutation.mutateAsync(data) }
  const handleUpdate = async (data: any) => {
    if (selectedCategory) await updateMutation.mutateAsync({ id: selectedCategory.id, data })
  }
  const handleDelete = async () => {
    if (selectedCategory) await deleteMutation.mutateAsync(selectedCategory.id)
  }
  const handleEdit = (category: Category) => {
    setSelectedCategory(category)
    setIsFormOpen(true)
  }
  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('categories.title')}</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('categories.add')}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder={t('categories.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
        </div>
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

      <CategoryTable categories={data?.categories || []} onEdit={handleEdit} onDelete={canDelete ? handleDeleteClick : undefined} isLoading={isLoading} />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: ((data.page - 1) * data.limit) + 1,
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('categories.entity')
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

      <CategoryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={selectedCategory}
        onSubmit={selectedCategory ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
      <CategoryDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        category={selectedCategory}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}