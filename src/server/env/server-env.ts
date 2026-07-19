import "server-only";

import { z } from "zod";
import { AppError } from "@/server/errors/app-error";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  TEST_DATABASE_URL: z.string().min(1).optional(),
  APP_ORIGIN: z.url().optional(),
});

export function getServerEnv() {
  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    APP_ORIGIN: process.env.APP_ORIGIN,
  });

  if (!result.success) {
    throw new AppError(
      "ENV_CONFIGURATION_ERROR",
      "서버 환경 변수가 올바르지 않습니다. DATABASE_URL 설정을 확인하세요.",
      503,
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}
