import { z } from 'zod'

const repairItemSchema = z.object({
  component_id: z.number().min(1),
  report: z.string().optional().default(''),
})

const serviceItemSchema = z.object({
  service_id: z.number().min(1),
  report: z.string().optional().default(''),
})

export const repairSchema = z
  .object({
    guarantee_id: z.number().min(1, 'A valid guarantee is required'),
    technician_id: z.number().optional(),
    description: z.string().optional(),
    components: z.array(repairItemSchema).default([]),
    services: z.array(serviceItemSchema).default([]),
  })
  .refine((data) => data.components.length > 0 || data.services.length > 0, {
    message: 'Add at least one component or service',
    path: ['components'],
  })

export type RepairFormValues = z.input<typeof repairSchema>

export const reviewRepairSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  notes: z.string().optional(),
})

export type ReviewRepairFormValues = z.input<typeof reviewRepairSchema>
