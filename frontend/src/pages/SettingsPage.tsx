import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { authService } from '@/api/auth'
import { api } from '@/api/axios'
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
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { CalendarSwitcher } from '@/components/common/CalendarSwitcher'
import { FormattedDate } from '@/components/common/FormattedDate'
import { KeyRound, Loader2, UserCog, SlidersHorizontal, MessageSquare } from 'lucide-react'

const smsTestSchema = z.object({
  to: z
    .string()
    .min(10, 'Enter a valid phone number')
    .max(20),
  text: z.string().min(1, 'Enter the message text'),
})

type SmsTestValues = z.infer<typeof smsTestSchema>

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address'),
})

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
  .refine((d) => d.new_password !== d.old_password, {
    path: ['new_password'],
    message: 'New password must differ from the current one',
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export function SettingsPage() {
  const { t } = useTranslation()
  const { admin, refreshProfile } = useAuth()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: '', full_name: '', email: '' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  })

  const smsForm = useForm<SmsTestValues>({
    resolver: zodResolver(smsTestSchema),
    defaultValues: { to: '', text: '' },
  })

  useEffect(() => {
    if (admin) {
      profileForm.reset({
        username: admin.username || '',
        full_name: admin.full_name || '',
        email: admin.email || '',
      })
    }
  }, [admin, profileForm])

  const onSaveProfile = async (values: ProfileValues) => {
    if (!admin) return
    setSavingProfile(true)
    try {
      await authService.updateProfile(admin.id, values)
      await refreshProfile()
      toast.success(t('settings.profileSaved', { defaultValue: 'Profile updated' }))
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          t('settings.profileSaveFailed', { defaultValue: 'Could not update the profile' })
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const onChangePassword = async (values: PasswordValues) => {
    setSavingPassword(true)
    try {
      await authService.changePassword(values.old_password, values.new_password)
      passwordForm.reset()
      toast.success(t('settings.passwordChanged', { defaultValue: 'Password changed' }))
    } catch (error: any) {
      const status = error.response?.status
      if (status === 401) {
        // A 401 here means the current password was wrong, not that the
        // session expired, so keep the person on the page and say so.
        passwordForm.setError('old_password', {
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
      setSavingPassword(false)
    }
  }

  const onSendTestSms = async (values: SmsTestValues) => {
    setSendingSms(true)
    try {
      await api.post('/sms/test', values)
      toast.success(t('settings.smsTestSent', { defaultValue: 'Test SMS sent' }))
      smsForm.reset({ to: values.to, text: '' })
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          t('settings.smsTestFailed', { defaultValue: 'Could not send the test SMS' })
      )
    } finally {
      setSendingSms(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('settings.title', { defaultValue: 'Settings' })}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.subtitle', {
            defaultValue: 'Manage your account details and how the system is displayed.',
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Account ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-muted-foreground" />
              {t('settings.account', { defaultValue: 'Account' })}
            </CardTitle>
            <CardDescription>
              {t('settings.accountDesc', {
                defaultValue: 'Your username, name, and email as they appear across the system.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">
                  {t('common.status', { defaultValue: 'Status' })}
                </p>
                <Badge variant={admin?.is_active ? 'default' : 'secondary'}>
                  {admin?.is_active
                    ? t('forms.active', { defaultValue: 'Active' })
                    : t('forms.inactive', { defaultValue: 'Inactive' })}
                </Badge>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <p className="text-muted-foreground">
                  {t('settings.memberSince', { defaultValue: 'Member since' })}
                </p>
                <p className="font-medium">
                  {admin?.created_at ? (
                    <FormattedDate date={admin.created_at} format="MMM DD, YYYY" />
                  ) : (
                    '-'
                  )}
                </p>
              </div>
            </div>

            <Separator />

            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {t('settings.username', { defaultValue: 'Username' })}
                </Label>
                <Input id="username" {...profileForm.register('username')} />
                {profileForm.formState.errors.username && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">
                  {t('settings.fullName', { defaultValue: 'Full name' })}
                </Label>
                <Input id="full_name" {...profileForm.register('full_name')} />
                {profileForm.formState.errors.full_name && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  {t('settings.email', { defaultValue: 'Email' })}
                </Label>
                <Input id="email" type="email" {...profileForm.register('email')} />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={savingProfile}>
                {savingProfile && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('settings.saveProfile', { defaultValue: 'Save changes' })}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Password ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              {t('settings.password', { defaultValue: 'Password' })}
            </CardTitle>
            <CardDescription>
              {t('settings.passwordDesc', {
                defaultValue:
                  'Confirm your current password, then choose a new one of at least 6 characters.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">
                  {t('settings.currentPassword', { defaultValue: 'Current password' })}
                </Label>
                <Input
                  id="old_password"
                  type="password"
                  autoComplete="current-password"
                  {...passwordForm.register('old_password')}
                />
                {passwordForm.formState.errors.old_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.old_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">
                  {t('settings.newPassword', { defaultValue: 'New password' })}
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('new_password')}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">
                  {t('settings.confirmPassword', { defaultValue: 'Repeat new password' })}
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('confirm_password')}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('settings.changePassword', { defaultValue: 'Change password' })}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Display ───────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              {t('settings.display', { defaultValue: 'Display' })}
            </CardTitle>
            <CardDescription>
              {t('settings.displayDesc', {
                defaultValue:
                  'Language and calendar are stored in this browser and apply to every screen.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher />
            <CalendarSwitcher />
          </CardContent>
        </Card>

        {/* ── SMS test ──────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              {t('settings.smsTest', { defaultValue: 'Test SMS' })}
            </CardTitle>
            <CardDescription>
              {t('settings.smsTestDesc', {
                defaultValue:
                  'Send an arbitrary SMS through the configured Melli Payamak test template, to confirm the integration works without waiting for a real guarantee approval, part request, or repair report.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={smsForm.handleSubmit(onSendTestSms)}
              className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr_auto] sm:items-end"
            >
              <div className="space-y-2">
                <Label htmlFor="sms_to">
                  {t('settings.smsTo', { defaultValue: 'Phone number' })}
                </Label>
                <Input id="sms_to" placeholder="09123456789" {...smsForm.register('to')} />
                {smsForm.formState.errors.to && (
                  <p className="text-sm text-destructive">
                    {smsForm.formState.errors.to.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms_text">
                  {t('settings.smsText', { defaultValue: 'Message text' })}
                </Label>
                <Input id="sms_text" {...smsForm.register('text')} />
                {smsForm.formState.errors.text && (
                  <p className="text-sm text-destructive">
                    {smsForm.formState.errors.text.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={sendingSms}>
                {sendingSms && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('settings.smsSend', { defaultValue: 'Send' })}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
