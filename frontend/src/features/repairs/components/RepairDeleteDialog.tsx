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

interface RepairDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

export function RepairDeleteDialog({
  open,
  onOpenChange,
  repair,
  onConfirm,
  isLoading,
}: RepairDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this repair request.
            <br />
            <span className="font-medium">Repair ID: #{repair?.id}</span>
            <br />
            <span className="text-destructive font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : 'Delete Repair'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}