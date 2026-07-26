import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  category_id: z.number().min(1, 'Please select a category'),
  is_active: z.boolean().default(true),
})

export type ProductFormValues = z.infer<typeof productSchema>