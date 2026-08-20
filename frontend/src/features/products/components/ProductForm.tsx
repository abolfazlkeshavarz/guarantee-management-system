import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { productSchema, ProductFormValues } from '../schemas/productSchema'
import { Product } from '../types'
import { categoryService } from '@/features/categories/api/categories'
import { useTranslation } from 'react-i18next'

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSubmit: (data: ProductFormValues) => Promise<void>
  isLoading?: boolean
}

export function ProductForm({ open, onOpenChange, product, onSubmit, isLoading }: ProductFormProps) {
  const { t } = useTranslation()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-active'],
    queryFn: categoryService.listActive,
    enabled: open,
  })

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { 
      name: '', 
      description: '', 
      category_id: 0, 
      is_active: true,
      code_prefix: '',
      code_format: 'simple',
      default_guarantee_months: 12,
      golden_guarantee_months: 3,
    },
  })

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || '',
        category_id: product.category_id,
        is_active: product.is_active,
        code_prefix: product.code_prefix || '',
        code_format: (product.code_format as any) || 'simple',
        default_guarantee_months: product.default_guarantee_months || 12,
        golden_guarantee_months: product.golden_guarantee_months || 3,
      })
    } else {
      form.reset({ 
        name: '', 
        description: '', 
        category_id: 0, 
        is_active: true,
        code_prefix: '',
        code_format: 'simple',
        default_guarantee_months: 12,
        golden_guarantee_months: 3,
      })
    }
  }, [product, form])

  const codeFormat = form.watch('code_format')
  // The catch-all builds no pattern, so a prefix would be collected and ignored.
  const prefixApplies = codeFormat !== 'any'

  const codeFormatOptions = [
    { value: 'simple', label: t('products.codeFormat.simple') },
    { value: 'jalali_encoded', label: t('products.codeFormat.jalaliEncoded') },
    { value: 'jalali_seasonal', label: t('products.codeFormat.jalaliSeasonal') },
    { value: 'any', label: t('products.codeFormat.any') },
  ]

  const codeFormatHints: Record<string, string> = {
    simple: t('products.codeFormat.simpleHint'),
    jalali_encoded: t('products.codeFormat.jalaliEncodedHint'),
    jalali_seasonal: t('products.codeFormat.jalaliSeasonalHint'),
    any: t('products.codeFormat.anyHint'),
  }

  const handleSubmit = async (data: ProductFormValues) => {
    await onSubmit(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{product ? t('products.form.editTitle') : t('products.form.createTitle')}</DialogTitle>
          <DialogDescription>
            {product ? t('products.form.editDescription') : t('products.form.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Smart TV 55"' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.table.category')} *</FormLabel>
                  <Select
                    items={categories.map((cat) => ({ value: String(cat.id), label: cat.name }))}
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
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
                  <FormLabel>{t('common.description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('products.form.codePrefix')}{prefixApplies ? ' *' : ''}</FormLabel>
                    <FormControl>
                      <Input placeholder={prefixApplies ? 'e.g. EVC' : t('products.codeFormat.noPrefixNeeded')} disabled={!prefixApplies} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('products.form.codeFormat')} *</FormLabel>
                    <Select
                      items={codeFormatOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {codeFormatOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{codeFormatHints[field.value] ?? ''}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_guarantee_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('products.form.defaultMonths')} *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="golden_guarantee_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('products.form.goldenMonths')} *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t('products.form.goldenHint', { n: field.value })}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.status')}</FormLabel>
                  <Select
                    items={[{ value: 'true', label: t('forms.active') }, { value: 'false', label: t('forms.inactive') }]}
                    value={field.value ? 'true' : 'false'}
                    onValueChange={(value) => field.onChange(value === 'true')}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">{t('forms.active')}</SelectItem>
                      <SelectItem value="false">{t('forms.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('common.saving') : product ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}