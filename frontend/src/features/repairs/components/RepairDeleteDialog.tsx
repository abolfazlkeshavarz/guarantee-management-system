import { useTranslation } from 'react-i18next'
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
import { AlertTriangle } from 'lucide-react'
import { Repair } from '../types'

interface RepairDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  /** True once a plain delete has come back saying a part was shipped. */
  blocked?: boolean
  /** Whether this account is allowed to force it through anyway. */
  canForce?: boolean
  onConfirm: () => Promise<void>
  onForceConfirm?: () => Promise<void>
  isLoading?: boolean
}

export function RepairDeleteDialog({
  open,
  onOpenChange,
  repair,
  blocked = false,
  canForce = false,
  onConfirm,
  onForceConfirm,
  isLoading,
}: RepairDeleteDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {!blocked ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('repairs.deleteDesc', {
                  code: repair?.guarantee_code,
                  customer: repair?.customer_name,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirm}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? t('common.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('repairs.forceDelete.title')}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">{t('repairs.forceDelete.desc')}</span>
                {canForce && (
                  <span className="block font-medium text-destructive">
                    {t('repairs.forceDelete.warning')}
                  </span>
                )}
                {!canForce && (
                  <span className="block">{t('repairs.forceDelete.needAdmin')}</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              {canForce && onForceConfirm && (
                <AlertDialogAction
                  onClick={onForceConfirm}
                  disabled={isLoading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isLoading ? t('common.deleting') : t('repairs.forceDelete.confirm')}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
