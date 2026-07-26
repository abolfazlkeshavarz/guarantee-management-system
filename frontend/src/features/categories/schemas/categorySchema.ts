import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type CategoryFormValues = z.infer<typeof categorySchema>