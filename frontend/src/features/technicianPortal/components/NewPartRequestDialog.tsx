import { useState } from 'react'
import { PartRequestItemsFields } from '@/features/partRequests/components/PartRequestItemsFields'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { technicianGuaranteeService, Guarantee } from '../api/technicianGuarantees'
import { technicianPartRequestService } from '@/features/partRequests/api/partRequests'
import {
  partRequestSchema,
  PartRequestFormValues,
} from '@/features/partRequests/schemas/partRequestSchema'
import {
  repairComponentService,
  repairServiceCatalogService,
} from '@/features/repairCatalog/api/repairCatalog'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'

type GuaranteeMode = 'unset' | 'with' | 'without'

const DEFAULT_VALUES: PartRequestFormValues = {
  guarantee_code: '',
  // Start with one blank line so the form is immediately usable.
  items: [{ item_type: 'component', item_id: undefined, custom_item_name: '', quantity: 1 }],
  notes: '',
}

export function NewPartRequestDialog() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [guaranteeMode, setGuaranteeMode] = useState<GuaranteeMode>('unset')
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [guarantee, setGuarantee] = useState<Guarantee | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  const { data: components = [] } = useQuery({
    queryKey: ['repair-components-active'],
    queryFn: () => repairComponentService.listActive(),
    enabled: open,
  })
  const { data: services = [] } = useQuery({
    queryKey: ['repair-services-active'],
    queryFn: () => repairServiceCatalogService.listActive(),
    enabled: open,
  })

  const form = useForm<PartRequestFormValues>({
    resolver: zodResolver(partRequestSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const createMutation = useMutation({
    mutationFn: (data: PartRequestFormValues) =>
      technicianPartRequestService.create({
        guarantee_code: guaranteeMode === 'with' ? code.trim().toUpperCase() : undefined,
        items: (data.items ?? []).map((item) => ({
          item_type: item.item_type,
          item_id: item.item_type === 'custom' ? undefined : item.item_id,
          custom_item_name: item.item_type === 'custom' ? item.custom_item_name : undefined,
          quantity: Number(item.quantity),
        })),
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-part-requests'] })
      toast.success(t('partRequests.submitSuccess'))
      handleOpenChange(false)
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || t('partRequests.submitError')),
  })

  const handleCheck = async () => {
    if (!code.trim()) return
    setChecking(true)
    setCheckError(null)
    setGuarantee(null)
    try {
      const result = await technicianGuaranteeService.checkByCode(code.trim().toUpperCase())
      setGuarantee(result)
    } catch (err: any) {
      setCheckError(err.response?.data?.message || t('partRequests.guaranteeNotFound'))
    } finally {
      setChecking(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setGuaranteeMode('unset')
      setCode('')
      setGuarantee(null)
      setCheckError(null)
      form.reset(DEFAULT_VALUES)
    }
    setOpen(newOpen)
  }

  const handleSubmit = async (data: PartRequestFormValues) => {
    await createMutation.mutateAsync(data)
  }

  // The item section unlocks once the technician has answered the guarantee
  // question: either "no guarantee", or "yes" plus a verified code.
  const itemSectionReady = guaranteeMode === 'without' || (guaranteeMode === 'with' && !!guarantee)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Plus className="h-4 w-4" />
            {t('partRequests.newRequest')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>
            {t('partRequests.newRequestTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1 - is this request tied to a guarantee? */}
        <div className="space-y-2">
          <Label className={isRTL ? 'text-right block' : ''}>
            {t('partRequests.guaranteeQuestion')}
          </Label>
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              type="button"
              variant={guaranteeMode === 'with' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGuaranteeMode('with')}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${isRTL ? 'ml-1.5' : 'me-1.5'}`} />
              {t('partRequests.withGuarantee')}
            </Button>
            <Button
              type="button"
              variant={guaranteeMode === 'without' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setGuaranteeMode('without')
                setCode('')
                setGuarantee(null)
                setCheckError(null)
              }}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              <ShieldOff className={`h-3.5 w-3.5 ${isRTL ? 'ml-1.5' : 'me-1.5'}`} />
              {t('partRequests.withoutGuarantee')}
            </Button>
          </div>
        </div>

        {guaranteeMode === 'with' && (
          <div className="space-y-2">
            <Label className={isRTL ? 'text-right block' : ''}>
              {t('partRequests.guaranteeCodeLabel')}
            </Label>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('partRequests.guaranteeCodePlaceholder')}
                disabled={!!guarantee}
                className={isRTL ? 'text-right' : ''}
              />
              {guarantee ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setGuarantee(null)
                    setCheckError(null)
                  }}
                >
                  {t('partRequests.change')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCheck}
                  disabled={checking || !code.trim()}
                  className={`gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {t('partRequests.check')}
                </Button>
              )}
            </div>
            {guarantee && (
              <div
                className={`p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 flex items-start gap-2 ${
                  isRTL ? 'flex-row-reverse' : ''
                }`}
              >
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="font-medium">{t('partRequests.guaranteeFound')}</p>
                  <p>
                    {guarantee.product_name} - {guarantee.customer_name}
                  </p>
                </div>
              </div>
            )}
            {checkError && (
              <div
                className={`p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 flex items-start gap-2 ${
                  isRTL ? 'flex-row-reverse' : ''
                }`}
              >
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className={isRTL ? 'text-right' : ''}>{checkError}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 - what is being requested? */}
        {itemSectionReady && (
          <>
            <Separator />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <PartRequestItemsFields
                  control={form.control as any}
                  components={components}
                  services={services}
                />
                {form.formState.errors.items && (
                  <p className="text-sm text-destructive">
                    {(form.formState.errors.items as any)?.message}
                  </p>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <Label className={isRTL ? 'text-right block' : ''}>
                        {t('partRequests.notesLabel')}
                      </Label>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          rows={3}
                          placeholder={t('partRequests.notesPlaceholder')}
                          className={`resize-none ${isRTL ? 'text-right' : ''}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending
                      ? t('partRequests.submitting')
                      : t('partRequests.submitRequest')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
