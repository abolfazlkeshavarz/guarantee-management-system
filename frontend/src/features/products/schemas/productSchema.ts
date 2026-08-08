import { z } from 'zod'

export const productSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  category_id: z
    .number()
    .min(1, 'Please select a category'),
  is_active: z.boolean(),
  code_prefix: z.string().min(2).max(20).regex(/^[A-Z0-9]+$/, 'Letters and digits only'),
  code_format: z.enum(['simple', 'jalali_encoded']),
  default_guarantee_months: z.number().min(1).max(120),
  golden_guarantee_months: z.number().min(0).max(120),
}).refine(d => d.golden_guarantee_months <= d.default_guarantee_months, {
  message: 'Golden period cannot exceed the total period',
  path: ['golden_guarantee_months'],
})

export type ProductFormValues = z.infer<typeof productSchema>