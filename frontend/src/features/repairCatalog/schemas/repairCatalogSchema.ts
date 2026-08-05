import { z } from 'zod'

export const repairCatalogSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type RepairCatalogFormValues = z.input<typeof repairCatalogSchema>
