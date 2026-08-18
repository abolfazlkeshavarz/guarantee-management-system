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
import { technicianSchema, TechnicianFormValues } from '../schemas/technicianSchema'
import { Technician } from '../types'

interface TechnicianFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  technician?: Technician | null
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

export function TechnicianForm({
  open,
  onOpenChange,
  technician,
  onSubmit,
  isLoading,
}: TechnicianFormProps) {
  const { t } = useTranslation()
  const isEditMode = !!technician

  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      full_name: '',
      username: '',
      password: '',
      phone: '',
      national_id: '',
      address: '',
      is_active: true,
      is_technical: false,
    },
  })

  useEffect(() => {
    if (technician) {
      form.reset({
        full_name: technician.full_name,
        username: technician.username,
        password: '',
        phone: technician.phone || '',
        national_id: technician.national_id || '',
        address: technician.address || '',
        is_active: technician.is_active,
        is_technical: technician.is_technical ?? false,
      })
    } else {
      form.reset({
        full_name: '',
        username: '',
        password: '',
        phone: '',
        national_id: '',
        address: '',
        is_active: true,
        is_technical: false,
      })
    }
  }, [technician, form])

  const handleSubmit = async (data: TechnicianFormValues) => {
    let submitData: any = { ...data }
    
    if (isEditMode) {
      if (!submitData.password) {
        delete submitData.password
      }
      delete submitData.username
    } else {
      if (!submitData.password) {
        form.setError('password', { 
          type: 'manual', 
          message: t('technicians.form.passwordRequired')
        })
        return
      }
    }
    
    await onSubmit(submitData)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('technicians.form.editTitle') : t('technicians.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t('technicians.form.editDescription')
              : t('technicians.form.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('technicians.form.fullName')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('technicians.form.fullNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('technicians.form.username')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('technicians.form.usernamePlaceholder')}
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditMode ? t('technicians.form.newPassword') : t('technicians.form.password')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditMode ? t('technicians.form.passwordPlaceholder') : '••••••'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('technicians.form.phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('technicians.form.phonePlaceholder')} {...field} />
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
                    <FormLabel>{t('technicians.form.nationalId')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('technicians.form.nationalIdPlaceholder')} {...field} />
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
                  <FormLabel>{t('technicians.form.address')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('technicians.form.addressPlaceholder')}
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
                  <FormLabel>{t('technicians.form.status')}</FormLabel>
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
            <FormField
              control={form.control}
              name="is_technical"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('technicians.form.role')}</FormLabel>
                  <Select
                    items={[
                      { value: 'false', label: t('technicians.role.technician') },
                      { value: 'true', label: t('technicians.role.technical') },
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
                      <SelectItem value="false">{t('technicians.role.technician')}</SelectItem>
                      <SelectItem value="true">{t('technicians.role.technical')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('technicians.role.technicalHint')}
                  </p>
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
                {isLoading ? t('common.saving') : isEditMode ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}