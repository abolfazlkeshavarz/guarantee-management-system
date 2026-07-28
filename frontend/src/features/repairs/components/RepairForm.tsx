import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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
import { Repair } from '../types'
import { guaranteeService } from '@/features/guarantees/api/guarantees'
import { technicianService } from '@/features/technicians/api/technicians'

interface RepairFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair?: Repair | null
  onSubmit: (data: RepairFormValues) => Promise<void>
  isLoading?: boolean
}

export function RepairForm({
  open,
  onOpenChange,
  repair,
  onSubmit,
  isLoading,
}: RepairFormProps) {
  const isEditMode = !!repair

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

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: {
      guarantee_id: 0,
      technician_id: undefined,
      description: '',
    },
  })

  useEffect(() => {
    if (repair) {
      form.reset({
        guarantee_id: repair.guarantee_id,
        technician_id: repair.technician_id || undefined,
        description: repair.description,
      })
    } else {
      form.reset({
        guarantee_id: 0,
        technician_id: undefined,
        description: '',
      })
    }
  }, [repair, form])

  const handleSubmit = async (data: RepairFormValues) => {
    await onSubmit(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  const isDisabled = isEditMode && repair?.status === 'Completed'

  if (open && (guaranteesLoading || techniciansLoading)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Repair' : 'Create New Repair'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the repair information below.'
              : 'Fill in the details to create a new repair.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="guarantee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guarantee *</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={isDisabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a guarantee">
                        {field.value ? guarantees.find(g => g.id === field.value)?.code : ''}
                      </SelectValue>
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
                  <FormLabel>Technician (Optional)</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    disabled={isDisabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Assign a technician">
                        {field.value ? technicians.find(t => t.id === field.value)?.full_name : ''}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the issue or repair needed..."
                      className="resize-none min-h-[100px]"
                      {...field}
                      disabled={isDisabled}
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
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isDisabled}>
                {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}