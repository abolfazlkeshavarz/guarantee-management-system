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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this repair?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the repair for <span className="font-medium">{repair?.guarantee_code}</span> ({repair?.customer_name}) as cancelled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {isLoading ? 'Cancelling...' : 'Cancel Repair'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
