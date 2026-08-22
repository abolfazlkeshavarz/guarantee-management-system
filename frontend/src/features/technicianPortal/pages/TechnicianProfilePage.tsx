import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useTechnicianAuth } from '../contexts/TechnicianAuthContext'
import { technicianAuthService } from '../api/technicianAuth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { KeyRound, Loader2, UserCircle } from 'lucide-react'

const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Enter your current password'),
    new_password: z.string().min(6, 'New password must be at least 6 characters'),
    confirm_password: z.string().min(6, 'Repeat the new password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

type PasswordValues = z.infer<typeof passwordSchema>

export function TechnicianProfilePage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const { technician } = useTechnicianAuth()
  const [saving, setSaving] = useState(false)

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  })

  const onSubmit = async (values: PasswordValues) => {
    setSaving(true)
    try {
      await technicianAuthService.changePassword(values.old_password, values.new_password)
      form.reset()
      toast.success(t('settings.passwordChanged', { defaultValue: 'Password changed' }))
    } catch (error: any) {
      if (error.response?.status === 401) {
        form.setError('old_password', {
          type: 'manual',
          message: t('settings.currentPasswordWrong', {
            defaultValue: 'That is not your current password',
          }),
        })
      } else {
        toast.error(
          error.response?.data?.message ||
            t('settings.passwordChangeFailed', { defaultValue: 'Could not change the password' })
        )
      }
    } finally {
      setSaving(false)
    }
  }

  const Detail = ({ label, value }: { label: string; value?: string }) => (
    <div className={isRTL ? 'text-right' : ''}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className={isRTL ? 'text-right' : ''}>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('technicianPortal.profileNav', { defaultValue: 'Profile' })}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.subtitle', {
            defaultValue: 'Manage your account details and how the system is displayed.',
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              {t('settings.account', { defaultValue: 'Account' })}
            </CardTitle>
            <CardDescription className={isRTL ? 'text-right' : ''}>
              {t('settings.technicianAccountDesc', {
                defaultValue: 'Contact your administrator to change these details.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Detail
                label={t('technicians.form.fullName', { defaultValue: 'Full name' })}
                value={technician?.full_name}
              />
              <Detail
                label={t('technicians.form.username', { defaultValue: 'Username' })}
                value={technician?.username}
              />
              <Detail
                label={t('technicians.form.phone', { defaultValue: 'Phone' })}
                value={technician?.phone}
              />
              <Detail
                label={t('technicians.form.nationalId', { defaultValue: 'National ID' })}
                value={technician?.national_id}
              />
            </div>

            <Detail
              label={t('technicians.form.address', { defaultValue: 'Address' })}
              value={technician?.address}
            />

            <Separator />

            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-muted-foreground">
                {t('common.status', { defaultValue: 'Status' })}
              </span>
              <Badge variant={technician?.is_active ? 'default' : 'secondary'}>
                {technician?.is_active
                  ? t('forms.active', { defaultValue: 'Active' })
                  : t('forms.inactive', { defaultValue: 'Inactive' })}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              {t('settings.password', { defaultValue: 'Password' })}
            </CardTitle>
            <CardDescription className={isRTL ? 'text-right' : ''}>
              {t('settings.passwordDesc', {
                defaultValue:
                  'Confirm your current password, then choose a new one of at least 6 characters.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password" className={isRTL ? 'text-right block' : ''}>
                  {t('settings.currentPassword', { defaultValue: 'Current password' })}
                </Label>
                <Input
                  id="old_password"
                  type="password"
                  autoComplete="current-password"
                  className={isRTL ? 'text-right' : ''}
                  {...form.register('old_password')}
                />
                {form.formState.errors.old_password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.old_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password" className={isRTL ? 'text-right block' : ''}>
                  {t('settings.newPassword', { defaultValue: 'New password' })}
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  className={isRTL ? 'text-right' : ''}
                  {...form.register('new_password')}
                />
                {form.formState.errors.new_password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.new_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className={isRTL ? 'text-right block' : ''}>
                  {t('settings.confirmPassword', { defaultValue: 'Repeat new password' })}
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  className={isRTL ? 'text-right' : ''}
                  {...form.register('confirm_password')}
                />
                {form.formState.errors.confirm_password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={saving} className={isRTL ? 'flex-row-reverse' : ''}>
                {saving && <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'me-2'}`} />}
                {t('settings.changePassword', { defaultValue: 'Change password' })}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* The Display card was removed: language and calendar are now one
            global setting an admin owns, not a per-technician preference. */}
      </div>
    </div>
  )
}
