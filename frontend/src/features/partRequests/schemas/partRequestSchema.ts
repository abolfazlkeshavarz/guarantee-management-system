import { z } from 'zod'

/**
 * One requested line. A request used to carry exactly one of these inline;
 * it now holds a list, because a technician usually needs several parts for
 * the same job and filing them separately made them hard to review together.
 */
export const partRequestItemSchema = z
  .object({
    item_type: z.enum(['component', 'service', 'custom']),
    item_id: z.number().optional(),
    custom_item_name: z.string().max(150).optional(),
    quantity: z.number().min(1).max(999),
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

export const partRequestSchema = z.object({
  // Empty means "not related to a guarantee" -- that's allowed.
  guarantee_code: z.string().optional(),
  // Optional link to the repair the parts are for.
  repair_id: z.number().optional(),
  items: z.array(partRequestItemSchema).min(1, 'Add at least one item'),
  notes: z.string().optional(),
})

export type PartRequestItemFormValues = z.input<typeof partRequestItemSchema>
export type PartRequestFormValues = z.input<typeof partRequestSchema>
