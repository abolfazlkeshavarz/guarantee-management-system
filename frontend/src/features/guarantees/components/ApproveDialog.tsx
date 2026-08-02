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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { approveSchema, ApproveFormValues } from '../schemas/guaranteeSchema'
import { Guarantee } from '../types'

interface ApproveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee: Guarantee | null
  action: 'approve' | 'reject'
  onConfirm: (data: ApproveFormValues) => Promise<void>
  isLoading?: boolean
}

export function ApproveDialog({
  open,
  onOpenChange,
  guarantee,
  action,
  onConfirm,
  isLoading,
}: ApproveDialogProps) {
  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      status: action === 'approve' ? 'Approved' : 'Rejected',
      notes: '',
    },
  })

  const handleSubmit = async (data: ApproveFormValues) => {
    await onConfirm(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  const title = action === 'approve' ? 'Approve Guarantee' : 'Reject Guarantee'
  const description =
    action === 'approve'
      ? 'Confirm the approval of this guarantee. This will mark it as active and valid.'
      : 'Confirm the rejection of this guarantee. This will mark it as rejected.'
  const buttonClass = action === 'approve' 
    ? 'bg-green-600 hover:bg-green-700' 
    : 'bg-red-600 hover:bg-red-700'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            <br />
            <span className="font-semibold">Guarantee: {guarantee?.code}</span>
            {' - '}
            <span className="text-muted-foreground">{guarantee?.customer_name}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action *</FormLabel>
                  <Select
                    items={[{ value: 'Approved', label: '✅ Approve' }, { value: 'Rejected', label: '❌ Reject' }]}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Approved">✅ Approve</SelectItem>
                      <SelectItem value="Rejected">❌ Reject</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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