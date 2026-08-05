import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { reviewRepairSchema, ReviewRepairFormValues } from '../schemas/repairSchema'
import { Repair } from '../types'

interface RepairReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: Repair | null
  action: 'approve' | 'reject'
  onConfirm: (data: ReviewRepairFormValues) => Promise<void>
  isLoading?: boolean
}

export function RepairReviewDialog({
  open,
  onOpenChange,
  repair,
  action,
  onConfirm,
  isLoading,
}: RepairReviewDialogProps) {
  const form = useForm<ReviewRepairFormValues>({
    resolver: zodResolver(reviewRepairSchema),
    defaultValues: {
      status: action === 'approve' ? 'Approved' : 'Rejected',
      notes: '',
    },
  })

  const handleSubmit = async (data: ReviewRepairFormValues) => {
    await onConfirm({ ...data, status: action === 'approve' ? 'Approved' : 'Rejected' })
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  const title = action === 'approve' ? 'Approve Repair' : 'Reject Repair'
  const buttonClass = action === 'approve'
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-red-600 hover:bg-red-700'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{repair?.guarantee_code}</span>
            {' - '}
            <span className="text-muted-foreground">{repair?.customer_name}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add notes about this decision..."
                      className="resize-none min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className={buttonClass}>
                {isLoading ? 'Processing...' : title}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
