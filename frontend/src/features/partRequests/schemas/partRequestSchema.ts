import { z } from 'zod'

export const partRequestSchema = z
  .object({
    // Empty means "not related to a guarantee" -- that's allowed.
    guarantee_code: z.string().optional(),
    item_type: z.enum(['component', 'service', 'custom']),
    item_id: z.number().optional(),
    custom_item_name: z.string().max(150).optional(),
    quantity: z.number().min(1).max(999),
    notes: z.string().optional(),
  })
  // Two separate refinements so the message lands on the field the technician
  // can actually see: the catalog select in catalog mode, the text input in
  // free-text mode.
  .refine((data) => data.item_type === 'custom' || (!!data.item_id && data.item_id > 0), {
    message: 'Select an item from the list',
    path: ['item_id'],
  })
  .refine(
    (data) =>
      data.item_type !== 'custom' ||
      (!!data.custom_item_name && data.custom_item_name.trim().length > 1),
    {
      message: 'Type the name of the item you need',
      path: ['custom_item_name'],
    }
  )

export type PartRequestFormValues = z.input<typeof partRequestSchema>
