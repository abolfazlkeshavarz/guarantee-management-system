// frontend/src/features/technicianPortal/components/NewRepairDialog.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form'
import { technicianAuthService } from '../api/technicianAuth'
import { technicianGuaranteeService, isGuaranteeValid, Guarantee } from '../api/technicianGuarantees'
import { repairComponentService, repairServiceCatalogService } from '@/features/repairCatalog/api/repairCatalog'
import { RepairItemsFields } from '@/features/repairs/components/RepairItemsFields'
import { repairSchema, RepairFormValues } from '@/features/repairs/schemas/repairSchema'
import { toast } from 'sonner'
import { Plus, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function NewRepairDialog() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [guarantee, setGuarantee] = useState<Guarantee | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  const queryClient = useQueryClient()

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
    defaultValues: { guarantee_id: 0, description: '', components: [], services: [] },
  })

  const createMutation = useMutation({
    mutationFn: (data: RepairFormValues) => technicianAuthService.createRepair(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-repairs'] })
      toast.success('Repair report submitted')
      handleOpenChange(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit repair report'),
  })

  const handleCheck = async () => {
    if (!code.trim()) return
    setChecking(true)
    setCheckError(null)
    setGuarantee(null)
    try {
      const result = await technicianGuaranteeService.checkByCode(code.trim().toUpperCase())
      if (!isGuaranteeValid(result)) {
        setCheckError(`This guarantee is ${result.status.toLowerCase()} or expired and cannot accept a new repair.`)
        return
      }
      setGuarantee(result)
      form.setValue('guarantee_id', result.id)
    } catch (err: any) {
      setCheckError(err.response?.data?.message || 'No guarantee matches this code.')
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async (data: RepairFormValues) => {
    await createMutation.mutateAsync(data)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCode('')
      setGuarantee(null)
      setCheckError(null)
      form.reset({ guarantee_id: 0, description: '', components: [], services: [] })
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Repair
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Repair Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Guarantee Code</Label>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter the guarantee code"
              disabled={!!guarantee}
            />
            {guarantee ? (
              <Button type="button" variant="outline" onClick={() => { setGuarantee(null); setCheckError(null); form.setValue('guarantee_id', 0) }}>
                Change
              </Button>
            ) : (
              <Button type="button" onClick={handleCheck} disabled={checking || !code.trim()}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Check
              </Button>
            )}
          </div>
          {guarantee && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Guarantee valid</p>
                <p>{guarantee.product_name} — {guarantee.customer_name}</p>
              </div>
            </div>
          )}
          {checkError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{checkError}</p>
            </div>
          )}
        </div>

        {guarantee && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <RepairItemsFields control={form.control as any} components={components} services={services} />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <Label>Additional Notes</Label>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Anything else worth noting about this repair..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.components && (
                <p className="text-sm text-destructive">{form.formState.errors.components.message}</p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Repair Report'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
