import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { DatePicker } from '@/components/ui/date-picker'
import { GuaranteeCodeInput } from '@/components/common/GuaranteeCodeInput'
import { customerService } from '@/features/customers/api/customers'
import { publicGuaranteeService } from '../api/publicGuarantee'
import { api } from '@/api/axios'
import { resolveFileUrl } from '@/lib/utils'
import { isValidGuaranteeCode } from '@/lib/guaranteeCode'
import { useDebounce } from '@/hooks/useDebounce'
import { AlertTriangle, FileText, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Guarantee } from '../types'
import type { UpdateGuaranteeData } from '../api/guarantees'

interface ProductLookup {
  id: number
  name: string
  category_name: string
  default_guarantee_months: number
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024

/** One document: shows what is attached, and lets it be replaced or removed. */
function DocumentField({
  label,
  value,
  onChange,
  onBusyChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
  onBusyChange: (busy: boolean) => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(t('toasts.fileTooLarge'))
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('toasts.fileTypeInvalid'))
      return
    }
    setBusy(true)
    onBusyChange(true)
    try {
      const result = await publicGuaranteeService.uploadFile(file)
      onChange(result.url)
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('toasts.uploadFailed'))
    } finally {
      setBusy(false)
      onBusyChange(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const url = value ? resolveFileUrl(value) : ''
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(value)

  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      {value ? (
        <div className="relative border rounded-lg p-2 bg-muted/30">
          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
            {isImage ? (
              <img src={url} alt={label} className="w-full h-32 object-contain rounded" />
            ) : (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-8 w-8" />
                {t('guarantees.edit.openFile')}
              </div>
            )}
          </a>
          {busy && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="me-1 h-3.5 w-3.5" />
              {t('guarantees.edit.replace')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onChange('')}
            >
              <X className="me-1 h-3.5 w-3.5" />
              {t('guarantees.edit.remove')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">{t('guarantees.edit.upload')}</p>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
        }}
      />
    </div>
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee: Guarantee | null
  onSubmit: (data: UpdateGuaranteeData) => Promise<void>
  isLoading?: boolean
}

/**
 * Corrects a guarantee that is still waiting for review - the code, dates,
 * notes, both documents and the customer's own details - so a typo in a
 * public registration can be fixed before it is approved rather than
 * rejected and re-entered.
 */
export function GuaranteeEditDialog({ open, onOpenChange, guarantee, onSubmit, isLoading }: Props) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  // Set once the user touches the code or purchase date, so the loaded expiry
  // is not recomputed out from under them just by opening the dialog.
  const touchedRef = useRef(false)

  const schema = useMemo(
    () =>
      z.object({
        guarantee_code: z
          .string()
          .min(3, t('validation.required', { defaultValue: 'This field is required' }))
          .max(50)
          .refine(isValidGuaranteeCode, t('guaranteeCode.englishOnly')),
        purchase_date: z.string().min(1, t('validation.required', { defaultValue: 'This field is required' })),
        expiry_date: z.string().min(1, t('validation.required', { defaultValue: 'This field is required' })),
        notes: z.string().optional(),
        invoice_image: z.string().optional(),
        guarantee_card_image: z.string().optional(),
        customer_full_name: z.string().min(2, t('validation.required', { defaultValue: 'This field is required' })).max(100),
        customer_phone: z.string().min(10, t('validation.required', { defaultValue: 'This field is required' })).max(20),
        // Optional: customers an admin registered by name and phone have none.
        customer_national_id: z.string().max(20).optional(),
        customer_province: z.string().max(50).optional(),
        customer_city: z.string().max(50).optional(),
        customer_address: z.string().optional(),
      }),
    [t]
  )
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      guarantee_code: '', purchase_date: '', expiry_date: '', notes: '',
      invoice_image: '', guarantee_card_image: '',
      customer_full_name: '', customer_phone: '', customer_national_id: '',
      customer_province: '', customer_city: '', customer_address: '',
    },
  })

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-for-guarantee-edit', guarantee?.customer_id],
    queryFn: () => customerService.getById(guarantee!.customer_id),
    enabled: open && !!guarantee,
  })

  // Fill the form once both the guarantee and its customer are in hand.
  useEffect(() => {
    if (!open || !guarantee || !customer) return
    touchedRef.current = false
    form.reset({
      guarantee_code: guarantee.code,
      purchase_date: guarantee.purchase_date?.slice(0, 10) ?? '',
      expiry_date: guarantee.expiry_date?.slice(0, 10) ?? '',
      notes: guarantee.notes ?? '',
      invoice_image: guarantee.invoice_image ?? '',
      guarantee_card_image: guarantee.guarantee_card_image ?? '',
      customer_full_name: customer.full_name ?? '',
      customer_phone: customer.phone ?? '',
      customer_national_id: customer.national_id ?? '',
      customer_province: customer.province ?? '',
      customer_city: customer.city ?? '',
      customer_address: customer.address ?? '',
    })
  }, [open, guarantee?.id, customer?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const code = form.watch('guarantee_code')
  const purchaseDate = form.watch('purchase_date')
  const debouncedCode = useDebounce(code, 500)
  const codeChanged = !!guarantee && code !== guarantee.code

  // Which product this code belongs to - the same lookup registration uses.
  const lookup = useQuery({
    queryKey: ['guarantee-edit-product-lookup', debouncedCode],
    queryFn: async (): Promise<ProductLookup> => {
      const r = await api.get('/products/public/lookup-by-code', { params: { code: debouncedCode } })
      return r.data.data
    },
    enabled: open && debouncedCode.length >= 3 && isValidGuaranteeCode(debouncedCode),
    retry: false,
  })
  const product = lookup.data

  // The cover period follows the product and the purchase date.
  const applyPeriod = (purchase: string, months?: number) => {
    if (!purchase || !months) return
    const d = new Date(purchase)
    d.setMonth(d.getMonth() + months)
    form.setValue('expiry_date', d.toISOString().slice(0, 10), { shouldDirty: true })
  }

  // A different code can mean a different product, hence a different length.
  useEffect(() => {
    if (touchedRef.current && product) applyPeriod(purchaseDate, product.default_guarantee_months)
  }, [product?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (v: Values) => {
    if (codeChanged && !product) {
      form.setError('guarantee_code', { type: 'manual', message: t('guarantees.edit.codeNoProduct') })
      return
    }
    await onSubmit({
      guarantee_code: v.guarantee_code.trim(),
      purchase_date: v.purchase_date,
      expiry_date: v.expiry_date,
      notes: v.notes ?? '',
      invoice_image: v.invoice_image ?? '',
      guarantee_card_image: v.guarantee_card_image ?? '',
      customer_full_name: v.customer_full_name.trim(),
      customer_phone: v.customer_phone.trim(),
      customer_national_id: (v.customer_national_id ?? '').trim(),
      customer_province: (v.customer_province ?? '').trim(),
      customer_city: (v.customer_city ?? '').trim(),
      customer_address: (v.customer_address ?? '').trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('guarantees.edit.title')}</DialogTitle>
          <DialogDescription>{t('guarantees.edit.description')}</DialogDescription>
        </DialogHeader>

        {customerLoading || !customer ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <h3 className="font-semibold">{t('guarantees.edit.sectionGuarantee')}</h3>

              <FormField
                control={form.control}
                name="guarantee_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('guarantees.edit.code')} *</FormLabel>
                    <FormControl>
                      <GuaranteeCodeInput
                        {...field}
                        onChange={(v) => {
                          touchedRef.current = true
                          field.onChange(v.toUpperCase())
                        }}
                      />
                    </FormControl>
                    <div className="text-xs">
                      {lookup.isFetching ? (
                        <span className="text-muted-foreground">{t('guarantees.edit.checking')}</span>
                      ) : product ? (
                        <span className="text-green-700">
                          {t('guarantees.edit.product')}: {product.name}
                        </span>
                      ) : codeChanged && lookup.isError ? (
                        <span className="text-red-600">{t('guarantees.edit.codeNoProduct')}</span>
                      ) : guarantee ? (
                        <span className="text-muted-foreground">
                          {t('guarantees.edit.product')}: {guarantee.product_name}
                        </span>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('guarantees.edit.purchaseDate')} *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={(d) => {
                            touchedRef.current = true
                            field.onChange(d)
                            applyPeriod(d, product?.default_guarantee_months)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('guarantees.edit.expiryDate')} *</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('guarantees.edit.notes')}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoice_image"
                  render={({ field }) => (
                    <FormItem>
                      <DocumentField
                        label={t('guarantees.edit.invoice')}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBusyChange={setUploading}
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guarantee_card_image"
                  render={({ field }) => (
                    <FormItem>
                      <DocumentField
                        label={t('guarantees.edit.card')}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBusyChange={setUploading}
                      />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <h3 className="font-semibold">{t('guarantees.edit.sectionCustomer')}</h3>
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{t('guarantees.edit.customerNote')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['customer_full_name', 'fullName'],
                  ['customer_phone', 'phone'],
                  ['customer_national_id', 'nationalId'],
                  ['customer_province', 'province'],
                  ['customer_city', 'city'],
                ] as const).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t(`guarantees.edit.${label}`)}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            dir={name === 'customer_phone' || name === 'customer_national_id' ? 'ltr' : undefined}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormField
                control={form.control}
                name="customer_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('guarantees.edit.address')}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading || uploading}>
                  {isLoading ? t('common.saving') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
