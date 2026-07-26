import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type CategoryFormValues = z.input<typeof categorySchema>;