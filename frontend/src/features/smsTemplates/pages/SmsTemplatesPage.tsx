import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Plus, Edit, Trash2, Send, AlertTriangle, Power } from 'lucide-react'
import { smsTemplateService } from '../api/smsTemplates'
import { SmsTemplate } from '../types'
import { SmsTemplateFormDialog } from '../components/SmsTemplateFormDialog'
import { SmsTemplateTestDialog } from '../components/SmsTemplateTestDialog'

/**
 * Every Melli Payamak pattern the system can send against. Built-ins are wired
 * to code paths (guarantee approved, part request, ...) and can only be
 * re-pointed at a different body id; custom ones are added here and picked by
 * name when sending a campaign.
 */
export function SmsTemplatesPage() {
  const { t } = useTranslation()
  const { canManageStaff: isFullAdmin } = usePermissions()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState<SmsTemplate | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [testing, setTesting] = useState<SmsTemplate | null>(null)
  const [deleting, setDeleting] = useState<SmsTemplate | null>(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: () => smsTemplateService.list(),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
    queryClient.invalidateQueries({ queryKey: ['sms-templates-usable'] })
  }
  const onError = (error: any) => toast.error(error.response?.data?.message || t('common.error'))

  const saveMutation = useMutation({
    mutationFn: (values: {
      key: string
      title: string
      description: string
      body_id: number
      sample_text: string
    }) =>
      editing
        ? smsTemplateService.update(editing.id, {
            title: values.title,
            description: values.description,
            body_id: values.body_id,
            sample_text: values.sample_text,
          })
        : smsTemplateService.create(values),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? t('smsTemplates.updateSuccess') : t('smsTemplates.createSuccess'))
      setIsFormOpen(false)
      setEditing(null)
    },
    onError,
  })

  const toggleMutation = useMutation({
    mutationFn: (template: SmsTemplate) =>
      smsTemplateService.update(template.id, { is_active: !template.is_active }),
    onSuccess: () => {
      invalidate()
      toast.success(t('smsTemplates.updateSuccess'))
    },
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => smsTemplateService.delete(id),
    onSuccess: () => {
      invalidate()
      toast.success(t('smsTemplates.deleteSuccess'))
      setDeleting(null)
    },
    onError,
  })

  const testMutation = useMutation({
    mutationFn: ({ id, to, text }: { id: number; to: string; text: string }) =>
      smsTemplateService.sendTest(id, to, text),
    onSuccess: () => {
      toast.success(t('smsTemplates.test.success'))
      setTesting(null)
    },
    onError,
  })

  const unconfigured = templates.filter((tpl) => tpl.is_builtin && tpl.body_id <= 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('smsTemplates.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('smsTemplates.subtitle')}</p>
        </div>
        {isFullAdmin && (
          <Button
            onClick={() => {
              setEditing(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="me-2 h-4 w-4" />
            {t('smsTemplates.add')}
          </Button>
        )}
      </div>

      {unconfigured.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-amber-900">
              {t('smsTemplates.unconfiguredTitle', { count: unconfigured.length })}
            </p>
            <p className="text-sm text-amber-800">{t('smsTemplates.unconfiguredDesc')}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('smsTemplates.table.name')}</TableHead>
                <TableHead>{t('smsTemplates.table.key')}</TableHead>
                <TableHead>{t('smsTemplates.table.bodyId')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      {template.title}
                      {template.is_builtin && (
                        <Badge variant="outline" className="text-[10px]">
                          {t('smsTemplates.builtin')}
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground max-w-md">
                        {template.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs" dir="ltr">
                      {template.key}
                    </span>
                  </TableCell>
                  <TableCell>
                    {template.body_id > 0 ? (
                      <span className="font-mono" dir="ltr">
                        {template.body_id}
                      </span>
                    ) : (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                        {t('smsTemplates.notSet')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        template.is_active
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {template.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" className="h-8 w-8 p-0" />}
                      >
                        <span className="sr-only">{t('common.openMenu')}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(template)
                            setIsFormOpen(true)
                          }}
                        >
                          <Edit className="me-2 h-4 w-4" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTesting(template)}
                          className="text-blue-600"
                        >
                          <Send className="me-2 h-4 w-4" />
                          {t('smsTemplates.test.action')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleMutation.mutate(template)}>
                          <Power className="me-2 h-4 w-4" />
                          {template.is_active ? t('common.deactivate') : t('common.activate')}
                        </DropdownMenuItem>
                        {isFullAdmin && !template.is_builtin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleting(template)}
                              className="text-destructive"
                            >
                              <Trash2 className="me-2 h-4 w-4" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SmsTemplateFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditing(null)
        }}
        template={editing}
        onSubmit={async (values) => {
          await saveMutation.mutateAsync(values).catch(() => undefined)
        }}
        isLoading={saveMutation.isPending}
      />

      <SmsTemplateTestDialog
        open={!!testing}
        onOpenChange={(open) => !open && setTesting(null)}
        template={testing}
        onConfirm={async (to, text) => {
          await testMutation.mutateAsync({ id: testing!.id, to, text }).catch(() => undefined)
        }}
        isLoading={testMutation.isPending}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('smsTemplates.deleteDesc', { name: deleting?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleting!.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
