import { z } from "zod";

export const AdminUserCreateSchema = z.object({
  email: z.string().trim().email().max(254),
  passwordHash: z.string().min(20).max(512),
  displayName: z.string().trim().min(1).max(100),
  active: z.boolean().default(true),
});

export type AdminUserCreateInput = z.infer<typeof AdminUserCreateSchema>;
