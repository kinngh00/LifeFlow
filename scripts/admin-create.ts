import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { pathToFileURL } from "node:url";
import { createAdminAccount } from "../src/features/admin/auth/services/create-admin-account";
import { createDatabaseClient } from "../src/server/db/create-database-client";
import { DomainError } from "../src/server/errors/domain-error";

async function readHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("비밀번호 숨김 입력을 위해 대화형 TTY가 필요합니다.");
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (chunk: string | Buffer) => {
      const text = String(chunk);
      if (text === "\u0003") {
        cleanup();
        reject(new Error("관리자 생성을 취소했습니다."));
        return;
      }
      if (text === "\r" || text === "\n") {
        cleanup();
        resolve(value);
        return;
      }
      if (text === "\u007f" || text === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (!text.startsWith("\u001b")) value += text;
    };
    stdin.on("data", onData);
  });
}

export async function runAdminCreateCli(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL 환경 변수가 필요합니다.");

  const reader = createInterface({ input: stdin, output: stdout });
  let database: ReturnType<typeof createDatabaseClient> | undefined;
  try {
    const email = await reader.question("관리자 이메일: ");
    const displayName = await reader.question("표시 이름: ");
    reader.close();
    const password = await readHidden("비밀번호: ");
    const passwordConfirmation = await readHidden("비밀번호 확인: ");
    database = createDatabaseClient(connectionString, { maxConnections: 1 });
    const created = await createAdminAccount(
      { email, displayName, password, passwordConfirmation },
      database,
    );
    stdout.write(`관리자 계정을 생성했습니다: ${created.email} (${created.displayName})\n`);
  } finally {
    reader.close();
    await database?.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAdminCreateCli().catch((error: unknown) => {
    const message = error instanceof DomainError || error instanceof Error
      ? error.message
      : "관리자 계정을 생성하지 못했습니다.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
