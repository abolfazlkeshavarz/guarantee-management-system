import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { RepairCatalogTable } from './RepairCatalogTable'
import { RepairCatalogFormDialog } from './RepairCatalogFormDialog'
import { RepairCatalogDeleteDialog } from './RepairCatalogDeleteDialog'
import { RepairCatalogEntry, RepairCatalogFormData } from '../types'

interface CatalogService {
  list: (page: number, limit: number, search: string) => Promise<{
    total: number
    page: number
    limit: number
    last_page: number
    [key: string]: any
  }>
  create: (data: RepairCatalogFormData) => Promise<RepairCatalogEntry>
  update: (id: number, data: Partial<RepairCatalogFormData>) => Promise<RepairCatalogEntry>
  delete: (id: number) => Promise<void>
}

interface RepairCatalogPanelProps {
  service: CatalogService
  queryKey: string
  entriesField: 'components' | 'services'
  addLabel: string
  createTitle: string
  editTitle: string
  namePlaceholder: string
  searchPlaceholder: string
}

export function RepairCatalogPanel({
  service, queryKey, entriesField, addLabel, createTitle, editTitle, namePlaceholder, searchPlaceholder,
}: RepairCatalogPanelProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<RepairCatalogEntry | null>(null)
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
    queryKey: [queryKey, page, debouncedSearch],
    queryFn: () => service.list(page, 10, debouncedSearch),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  }

  const createMutation = useMutation({
    mutationFn: service.create,
    onSuccess: () => {
      invalidateAll()
      toast.success('Created successfully')
      setIsFormOpen(false)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RepairCatalogFormData> }) => service.update(id, data),
    onSuccess: () => {
      invalidateAll()
      toast.success('Updated successfully')
      setIsFormOpen(false)
      setSelectedEntry(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: service.delete,
    onSuccess: () => {
      invalidateAll()
      toast.success('Deleted successfully')
      setIsDeleteOpen(false)
      setSelectedEntry(null)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete'),
  })

  const handleCreate = async (formData: RepairCatalogFormData) => { await createMutation.mutateAsync(formData) }
  const handleUpdate = async (formData: RepairCatalogFormData) => {
    if (selectedEntry) await updateMutation.mutateAsync({ id: selectedEntry.id, data: formData })
  }
  const handleDelete = async () => {
    if (selectedEntry) await deleteMutation.mutateAsync(selectedEntry.id)
  }
  const handleEdit = (entry: RepairCatalogEntry) => {
    setSelectedEntry(entry)
    setIsFormOpen(true)
  }
  const handleDeleteClick = (entry: RepairCatalogEntry) => {
    setSelectedEntry(entry)
    setIsDeleteOpen(true)
  }

  const entries: RepairCatalogEntry[] = data?.[entriesField] || []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => { setSelectedEntry(null); setIsFormOpen(true) }} className="ms-auto">
          <Plus className="me-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <RepairCatalogTable entries={entries} onEdit={handleEdit} onDelete={handleDeleteClick} isLoading={isLoading} />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</Button>
            <Button variant="outline" disabled={data.page >= data.last_page} onClick={() => setPage(data.page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <RepairCatalogFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        entry={selectedEntry}
        title={createTitle}
        editTitle={editTitle}
        namePlaceholder={namePlaceholder}
        onSubmit={selectedEntry ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
      <RepairCatalogDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        entry={selectedEntry}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
