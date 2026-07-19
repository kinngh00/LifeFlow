import "dotenv/config";
import { pathToFileURL } from "node:url";
import { importVerifiedProgramBatch } from "./import-first-verified-programs";
import { thirdVerifiedPrograms } from "./data/third-verified-programs";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.LIFEFLOW_DATA_ADMIN_EMAIL;
  if (!databaseUrl) throw new Error("DATABASE_URL 환경 변수가 필요합니다.");
  if (!adminEmail) throw new Error("LIFEFLOW_DATA_ADMIN_EMAIL 환경 변수가 필요합니다.");
  const publish = process.argv.includes("--publish");
  const results = await importVerifiedProgramBatch(thirdVerifiedPrograms, { databaseUrl, adminEmail, publish });
  process.stdout.write(`${JSON.stringify({ mode: publish ? "PUBLISH" : "DRAFT_ONLY", results }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "데이터 입력에 실패했습니다."}\n`);
    process.exitCode = 1;
  });
}
