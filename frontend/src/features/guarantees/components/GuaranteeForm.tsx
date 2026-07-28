import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { guaranteeSchema, GuaranteeFormValues } from '../schemas/guaranteeSchema'
import { Guarantee } from '../types'
import { customerService } from '@/features/customers/api/customers'
import { productService } from '@/features/products/api/products'
import { DatePicker } from '@/components/ui/date-picker'

interface GuaranteeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guarantee?: Guarantee | null
  onSubmit: (data: GuaranteeFormValues) => Promise<void>
  isLoading?: boolean
}

export function GuaranteeForm({
  open,
  onOpenChange,
  guarantee,
  onSubmit,
  isLoading,
}: GuaranteeFormProps) {
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-list-for-select'],
    queryFn: () => customerService.list(1, 100).then(r => r.customers),
    enabled: open,
  })

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products-list-for-select'],
    queryFn: () => productService.list(1, 100).then(r => r.products),
    enabled: open,
  })

  const form = useForm<GuaranteeFormValues>({
    resolver: zodResolver(guaranteeSchema),
    defaultValues: {
      customer_id: 0,
      product_id: 0,
      purchase_date: '',
      expiry_date: '',
      invoice_image: '',
      guarantee_card_image: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (guarantee) {
      form.reset({
        customer_id: guarantee.customer_id,
        product_id: guarantee.product_id,
        purchase_date: guarantee.purchase_date,
        expiry_date: guarantee.expiry_date,
        invoice_image: guarantee.invoice_image || '',
        guarantee_card_image: guarantee.guarantee_card_image || '',
        notes: guarantee.notes || '',
      })
    } else {
      form.reset({
        customer_id: 0,
        product_id: 0,
        purchase_date: '',
        expiry_date: '',
        invoice_image: '',
        guarantee_card_image: '',
        notes: '',
      })
    }
  }, [guarantee, form])

  const handleSubmit = async (data: GuaranteeFormValues) => {
    await onSubmit(data)
    if (!isLoading) {
      form.reset()
      onOpenChange(false)
    }
  }

  const isEditMode = !!guarantee
  const isPending = guarantee?.status === 'Pending'
  const isDisabled = isEditMode && !isPending

  if (open && (customersLoading || productsLoading)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Guarantee' : 'Create New Guarantee'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the guarantee information below. Only pending guarantees can be edited.'
              : 'Fill in the details to create a new guarantee.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={isDisabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a customer">
                          {field.value ? customers.find(c => c.id === field.value)?.full_name : ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.full_name} (ID: {c.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={isDisabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a product">
                          {field.value ? products.find(p => p.id === field.value)?.name : ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} (ID: {p.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoice_image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/invoice.jpg" 
                        {...field} 
                        disabled={isDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guarantee_card_image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guarantee Card URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/card.jpg" 
                        {...field} 
                        disabled={isDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this guarantee"
                      className="resize-none min-h-[80px]"
                      {...field}
                      disabled={isDisabled}
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
              <Button type="submit" disabled={isLoading || isDisabled}>
                {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}