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
  // Optional here because the catch-all format has no prefix to speak of; the
  // refinement below still demands one for every format that builds a pattern.
  code_prefix: z.string().max(20).regex(/^[A-Z0-9]*$/, 'Letters and digits only').optional(),
  code_format: z.enum(['simple', 'jalali_encoded', 'jalali_seasonal', 'any']),
  default_guarantee_months: z.number().min(1).max(120),
  golden_guarantee_months: z.number().min(0).max(120),
}).refine(d => d.golden_guarantee_months <= d.default_guarantee_months, {
  message: 'Golden period cannot exceed the total period',
  path: ['golden_guarantee_months'],
}).refine(d => d.code_format === 'any' || (d.code_prefix ?? '').length >= 2, {
  message: 'Code prefix must be at least 2 characters',
  path: ['code_prefix'],
})

export type ProductFormValues = z.infer<typeof productSchema>