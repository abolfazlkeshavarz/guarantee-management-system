import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { repairSchema, RepairFormValues } from '../schemas/repairSchema'
import { RepairItemsFields } from './RepairItemsFields'
import { guaranteeService } from '@/features/guarantees/api/guarantees'
import { technicianService } from '@/features/technicians/api/technicians'
import { repairComponentService, repairServiceCatalogService } from '@/features/repairCatalog/api/repairCatalog'

interface RepairFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RepairFormValues) => Promise<void>
  isLoading?: boolean
}

export function RepairForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: RepairFormProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'

  const { data: guarantees = [], isLoading: guaranteesLoading } = useQuery({
    queryKey: ['guarantees-list-for-repair-form'],
    queryFn: () => guaranteeService.list(1, 100).then(r => r.guarantees),
    enabled: open,
  })

  const { data: technicians = [], isLoading: techniciansLoading } = useQuery({
    queryKey: ['technicians-list-for-repair-form'],
    queryFn: () => technicianService.list(1, 100).then(r => r.technicians),
    enabled: open,
  })

  const { data: components = [] } = useQuery({
    queryKey: ['repair-components-active'],
    queryFn: repairComponentService.listActive,
    enabled: open,
  })
  const { data: services = [] } = useQuery({
    queryKey: ['repair-services-active'],
    queryFn: repairServiceCatalogService.listActive,
    enabled: open,
  })

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: {
      guarantee_id: 0,
      technician_id: undefined,
      description: '',
      components: [],
      services: [],
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({
        guarantee_id: 0,
        technician_id: undefined,
        description: '',
        components: [],
        services: [],
      })
    }
  }, [open, form])

  const handleSubmit = async (data: RepairFormValues) => {
    await onSubmit(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  const isLoadingData = guaranteesLoading || techniciansLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>{t('repairs.createTitle')}</DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('repairs.createDesc')}
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="guarantee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('repairs.guaranteeLabel')} *</FormLabel>
                    <Select
                      items={guarantees.map((g) => ({ value: String(g.id), label: `${g.code} - ${g.customer_name}` }))}
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('repairs.selectGuarantee')} />
                      </SelectTrigger>
                      <SelectContent>
                        {guarantees.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>
                            {g.code} - {g.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="technician_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('repairs.technicianOptional')}</FormLabel>
                    <Select
                      items={technicians.map((t) => ({ value: String(t.id), label: `${t.full_name} (${t.username})` }))}
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('repairs.assignTechnician')} />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.full_name} ({t.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <RepairItemsFields control={form.control as any} components={components} services={services} />
              {form.formState.errors.components && (
                <p className="text-sm text-destructive">{form.formState.errors.components.message}</p>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('repairs.notesPlaceholder')}
                        className="resize-none min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('repairs.creating') : t('forms.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
