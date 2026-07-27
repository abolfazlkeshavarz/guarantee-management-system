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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { renewSchema, RenewFormValues } from '../schemas/guaranteeSchema'
import { Guarantee } from '../types'
import { format } from 'date-fns'

interface RenewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee: Guarantee | null
  onConfirm: (data: RenewFormValues) => Promise<void>
  isLoading?: boolean
}

export function RenewDialog({
  open,
  onOpenChange,
  guarantee,
  onConfirm,
  isLoading,
}: RenewDialogProps) {
  const form = useForm<RenewFormValues>({
    resolver: zodResolver(renewSchema),
    defaultValues: {
      new_expiry_date: '',
      notes: '',
    },
  })

  const handleSubmit = async (data: RenewFormValues) => {
    await onConfirm(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Renew Guarantee</DialogTitle>
          <DialogDescription>
            Extend the expiry date for this guarantee.
            <br />
            <span className="font-semibold">Guarantee: {guarantee?.code}</span>
            {' - '}
            <span className="text-muted-foreground">{guarantee?.customer_name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted p-3 rounded-md text-sm">
          <p><span className="font-medium">Current expiry date:</span> {guarantee?.expiry_date && format(new Date(guarantee.expiry_date), 'MMMM d, yyyy')}</p>
          <p><span className="font-medium">Status:</span> {guarantee?.status}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Expiry Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                      placeholder="Add notes about this renewal..."
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
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? 'Processing...' : 'Renew Guarantee'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}