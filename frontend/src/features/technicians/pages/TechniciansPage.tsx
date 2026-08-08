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
import { TechnicianTable } from '../components/TechnicianTable'
import { TechnicianForm } from '../components/TechnicianForm'
import { TechnicianDeleteDialog } from '../components/TechnicianDeleteDialog'
import { technicianService } from '../api/technicians'
import { Technician } from '../types'
import { TechnicianFormValues } from '../schemas/technicianSchema'
import { queryClient, invalidateDashboard } from '@/lib/query-client'

export function TechniciansPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null)
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
    queryKey: ['technicians', page, limit, debouncedSearch],
    queryFn: () => technicianService.list(page, limit, debouncedSearch),
  })

  const createMutation = useMutation({
    mutationFn: technicianService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] })
      invalidateDashboard()
      toast.success(t('technicians.createSuccess'))
      setIsFormOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common.error'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      technicianService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] })
      invalidateDashboard()
      toast.success(t('technicians.updateSuccess'))
      setIsFormOpen(false)
      setSelectedTechnician(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common.error'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: technicianService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] })
      invalidateDashboard()
      toast.success(t('technicians.deleteSuccess'))
      setIsDeleteOpen(false)
      setSelectedTechnician(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common.error'))
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      technicianService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] })
      invalidateDashboard()
      toast.success(t('technicians.toggleSuccess'))
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common.error'))
    },
  })

  const handleCreate = async (data: TechnicianFormValues) => {
    if (!data.password) {
      toast.error(t('technicians.form.passwordRequired'))
      return
    }
    await createMutation.mutateAsync(data as any)
  }

  const handleUpdate = async (data: TechnicianFormValues) => {
    if (selectedTechnician) {
      const { username, ...updateData } = data
      await updateMutation.mutateAsync({ 
        id: selectedTechnician.id, 
        data: updateData 
      })
    }
  }

  const handleDelete = async () => {
    if (selectedTechnician) {
      await deleteMutation.mutateAsync(selectedTechnician.id)
    }
  }

  const handleToggleStatus = async (tech: Technician) => {
    await toggleStatusMutation.mutateAsync({
      id: tech.id,
      data: { is_active: !tech.is_active },
    })
  }

  const handleEdit = (technician: Technician) => {
    setSelectedTechnician(technician)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (technician: Technician) => {
    setSelectedTechnician(technician)
    setIsDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('technicians.title')}</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('technicians.add')}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={t('technicians.searchPlaceholder')}
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
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <TechnicianTable
        technicians={data?.technicians || []}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteClick}
        isLoading={isLoading}
      />

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('common.showingRange', {
              from: Math.min((data.page - 1) * data.limit + 1, data.total),
              to: Math.min(data.page * data.limit, data.total),
              total: data.total,
              entity: t('technicians.entity')
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

      <TechnicianForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        technician={selectedTechnician}
        onSubmit={selectedTechnician ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <TechnicianDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        technician={selectedTechnician}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}