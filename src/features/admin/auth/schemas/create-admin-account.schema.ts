import { z } from "zod";
import {
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
} from "@/server/auth/password-core";

export const CreateAdminAccountSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    displayName: z.string().trim().min(2).max(100),
    password: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH),
    passwordConfirmation: z.string(),
  })
  .strict()
  .refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "비밀번호 확인이 일치하지 않습니다.",
  });

export type CreateAdminAccountInput = z.input<typeof CreateAdminAccountSchema>;
