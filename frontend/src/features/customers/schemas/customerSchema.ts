import { z } from 'zod'

export const customerSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  phone: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format'),
  national_id: z.string()
    .min(6, 'National ID must be at least 6 characters')
    .max(20, 'National ID must be less than 20 characters'),
  province: z.string().max(50, 'Province must be less than 50 characters').optional(),
  city: z.string().max(50, 'City must be less than 50 characters').optional(),
  address: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>