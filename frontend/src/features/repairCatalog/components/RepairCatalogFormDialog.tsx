import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
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
import { repairCatalogSchema, RepairCatalogFormValues } from '../schemas/repairCatalogSchema'
import { RepairCatalogEntry } from '../types'

interface RepairCatalogFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: RepairCatalogEntry | null
  title: string
  editTitle: string
  namePlaceholder: string
  onSubmit: (data: RepairCatalogFormValues) => Promise<void>
  isLoading?: boolean
}

export function RepairCatalogFormDialog({
  open, onOpenChange, entry, title, editTitle, namePlaceholder, onSubmit, isLoading,
}: RepairCatalogFormDialogProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const form = useForm<RepairCatalogFormValues>({
    resolver: zodResolver(repairCatalogSchema),
    defaultValues: { name: '', description: '', is_active: true },
  })

  useEffect(() => {
    if (entry) {
      form.reset({
        name: entry.name,
        description: entry.description || '',
        is_active: entry.is_active,
      })
    } else {
      form.reset({ name: '', description: '', is_active: true })
    }
  }, [entry, form])

  const handleSubmit = async (data: RepairCatalogFormValues) => {
    await onSubmit(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>{entry ? editTitle : title}</DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('repairCatalog.formDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={namePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('repairCatalog.descriptionPlaceholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.status')}</FormLabel>
                  <Select
                    items={[
                      { value: 'true', label: t('forms.active') },
                      { value: 'false', label: t('forms.inactive') },
                    ]}
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
                {isLoading ? t('common.saving') : entry ? t('forms.update') : t('forms.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
