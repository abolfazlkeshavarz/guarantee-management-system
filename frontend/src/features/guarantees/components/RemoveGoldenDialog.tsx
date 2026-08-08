import { useTranslation } from 'react-i18next'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Guarantee } from '../types'

interface RemoveGoldenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee: Guarantee | null
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

export function RemoveGoldenDialog({ open, onOpenChange, guarantee, onConfirm, isLoading }: RemoveGoldenDialogProps) {
  const { t } = useTranslation()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('guarantees.setGoldenDialog.removeTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('guarantees.setGoldenDialog.removeDescription')}
            {guarantee && (
              <span className="block mt-2 font-medium text-foreground">{guarantee.code}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? t('common.deleting') : t('guarantees.setGoldenDialog.removeConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}