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
import { Repair } from '../types'

interface RepairCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

export function RepairCancelDialog({
  open,
  onOpenChange,
  repair,
  onConfirm,
  isLoading,
}: RepairCancelDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('repairs.cancelConfirm')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('repairs.cancelDesc', { 
              code: repair?.guarantee_code, 
              customer: repair?.customer_name 
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {isLoading ? t('common.saving') : t('common.cancel')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}