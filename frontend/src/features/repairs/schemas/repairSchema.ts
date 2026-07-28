import { z } from 'zod'

export const repairSchema = z.object({
  guarantee_id: z.number().min(1, 'Please select a guarantee'),
  technician_id: z.number().optional(),
  description: z.string().min(3, 'Description must be at least 3 characters'),
})

export type RepairFormValues = z.input<typeof repairSchema>

export const repairUpdateSchema = z.object({
  technician_id: z.number().optional(),
  status: z.enum(['Pending', 'InProgress', 'Completed', 'Cancelled']).optional(),
  description: z.string().min(3, 'Description must be at least 3 characters').optional(),
})

export type RepairUpdateFormValues = z.input<typeof repairUpdateSchema>