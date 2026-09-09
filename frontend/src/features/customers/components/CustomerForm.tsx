import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { customerSchema, CustomerFormValues } from '../schemas/customerSchema'
import { Customer } from '../types'

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSubmit: (data: CustomerFormValues) => Promise<void>
  isLoading?: boolean
}

export function CustomerForm({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isLoading,
}: CustomerFormProps) {
  const { t } = useTranslation()

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      national_id: '',
      province: '',
      city: '',
      address: '',
    },
  })

  useEffect(() => {
    if (customer) {
      form.reset({
        full_name: customer.full_name,
        phone: customer.phone,
        national_id: customer.national_id,
        province: customer.province || '',
        city: customer.city || '',
        address: customer.address || '',
      })
    } else {
      form.reset({
        full_name: '',
        phone: '',
        national_id: '',
        province: '',
        city: '',
        address: '',
      })
    }
  }, [customer, form])

  const handleSubmit = async (data: CustomerFormValues) => {
    await onSubmit(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  const req = ` *`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {customer ? t('customers.form.editTitle') : t('customers.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? t('customers.form.editDescription')
              : t('customers.form.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('customers.form.fullName')}{req}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('customers.form.fullNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.phone')}{req}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('customers.form.phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="national_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.nationalId')}{req}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('customers.form.nationalIdPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.province')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('customers.form.provincePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customers.form.city')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('customers.form.cityPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('customers.form.address')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('customers.form.addressPlaceholder')}
                      className="resize-none"
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
                {isLoading
                  ? t('common.saving')
                  : customer
                    ? t('common.update')
                    : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
