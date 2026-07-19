import { z } from "zod";
import {
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
} from "@/server/auth/password";

export const AdminLoginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH),
  })
  .strict();

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;
