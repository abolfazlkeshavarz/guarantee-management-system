import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
import {
  RepairItemsFields,
  type DeliveredPart,
} from '@/features/repairs/components/RepairItemsFields'
import { technicianPartRequestService } from '@/features/partRequests/api/partRequests'
import { repairSchema, RepairFormValues } from '@/features/repairs/schemas/repairSchema'
import { toast } from 'sonner'
import { Plus, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function NewRepairDialog() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
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

  // The parts this technician has actually been handed. A repair report names
  // what was fitted, so it can only name something that reached them.
  //
  // Never served from cache. Delivery happens on someone else's screen, so a
  // technician who opened this dialog before their part arrived would keep
  // being told they have nothing -- the app's default five-minute staleTime
  // would hold that empty answer well past the moment it stopped being true.
  //
  // The limit is 100 because the API clamps anything higher back down to 10,
  // which would silently hide all but the ten most recent deliveries.
  const { data: deliveredRequests } = useQuery({
    queryKey: ['my-delivered-part-requests'],
    queryFn: () => technicianPartRequestService.list(1, 100, 'Delivered'),
    enabled: open,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const deliveredLines = (deliveredRequests?.requests ?? []).flatMap((request) =>
    (request.items ?? []).map((item) => ({
      itemId: item.id,
      requestId: request.id,
      catalogId: item.item_id ?? 0,
      name: item.item_name,
      quantity: item.quantity,
      itemType: item.item_type,
    }))
  )

  // A custom line has no catalog entry to report against, so it cannot back a
  // repair line; it still shows on the request itself.
  const deliveredComponents: DeliveredPart[] = deliveredLines.filter(
    (l) => l.itemType === 'component' && l.catalogId > 0
  )
  const deliveredServices: DeliveredPart[] = deliveredLines.filter(
    (l) => l.itemType === 'service' && l.catalogId > 0
  )

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: { guarantee_id: 0, description: '', components: [], services: [] },
  })

  const createMutation = useMutation({
    mutationFn: (data: RepairFormValues) => technicianAuthService.createRepair(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-repairs'] })
      toast.success(t('technicianPortal.submitSuccess'))
      handleOpenChange(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t('technicianPortal.submitError')),
  })

  const handleCheck = async () => {
    if (!code.trim()) return
    setChecking(true)
    setCheckError(null)
    setGuarantee(null)
    try {
      const result = await technicianGuaranteeService.checkByCode(code.trim().toUpperCase())
      if (!isGuaranteeValid(result)) {
        const statusLabel = t(`repairs.status.${result.status}`, { defaultValue: result.status })
        setCheckError(t('technicianPortal.guaranteeInvalidStatus', { status: statusLabel }))
        return
      }
      setGuarantee(result)
      form.setValue('guarantee_id', result.id)
    } catch (err: any) {
      setCheckError(err.response?.data?.message || t('technicianPortal.guaranteeNotFound'))
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
          <Button className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Plus className="h-4 w-4" />
            {t('technicianPortal.newRepair')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>{t('technicianPortal.newRepairTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label className={isRTL ? 'text-right block' : ''}>{t('technicianPortal.guaranteeCodeLabel')}</Label>
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('technicianPortal.guaranteeCodePlaceholder')}
              disabled={!!guarantee}
              className={isRTL ? 'text-right' : ''}
            />
            {guarantee ? (
              <Button type="button" variant="outline" onClick={() => { setGuarantee(null); setCheckError(null); form.setValue('guarantee_id', 0) }}>
                {t('technicianPortal.change')}
              </Button>
            ) : (
              <Button type="button" onClick={handleCheck} disabled={checking || !code.trim()} className={isRTL ? 'flex-row-reverse' : ''}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t('technicianPortal.check')}
              </Button>
            )}
          </div>
          {guarantee && (
            <div className={`p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <div className={isRTL ? 'text-right' : ''}>
                <p className="font-medium">{t('technicianPortal.guaranteeValid')}</p>
                <p>{guarantee.product_name} — {guarantee.customer_name}</p>
              </div>
            </div>
          )}
          {checkError && (
            <div className={`p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <XCircle className={`h-4 w-4 mt-0.5 shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <p className={isRTL ? 'text-right' : ''}>{checkError}</p>
            </div>
          )}
        </div>

        {guarantee && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <RepairItemsFields
                control={form.control as any}
                components={components}
                services={services}
                deliveredComponents={deliveredComponents}
                deliveredServices={deliveredServices}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <Label className={isRTL ? 'text-right block' : ''}>{t('technicianPortal.additionalNotes')}</Label>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('technicianPortal.additionalNotesPlaceholder')}
                        rows={3}
                        className={isRTL ? 'text-right' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.components && (
                <p className="text-sm text-destructive">{form.formState.errors.components.message}</p>
              )}

              <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
                <Button type="submit" disabled={createMutation.isPending} className={isRTL ? 'flex-row-reverse' : ''}>
                  {createMutation.isPending ? t('technicianPortal.submitting') : t('technicianPortal.submitReport')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}