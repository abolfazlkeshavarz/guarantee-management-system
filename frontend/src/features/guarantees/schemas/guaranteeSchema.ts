import { z } from 'zod'

export const guaranteeSchema = z.object({
  customer_id: z.number().min(1, 'Please select a customer'),
  product_id: z.number().min(1, 'Please select a product'),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  invoice_image: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  guarantee_card_image: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
})

export type GuaranteeFormValues = z.infer<typeof guaranteeSchema>

export const approveSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  notes: z.string().optional(),
})

export type ApproveFormValues = z.infer<typeof approveSchema>

export const renewSchema = z.object({
  new_expiry_date: z.string().min(1, 'New expiry date is required'),
  notes: z.string().optional(),
})

export type RenewFormValues = z.infer<typeof renewSchema>