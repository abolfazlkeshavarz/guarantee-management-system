import { z } from 'zod'

export const technicianSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 characters').max(20).optional(),
  national_id: z.string().min(6, 'National ID must be at least 6 characters').max(20).optional(),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type TechnicianFormValues = z.input<typeof technicianSchema>