import "dotenv/config";
import { pathToFileURL } from "node:url";
import { createProgramWithInitialVersion } from "@/features/admin/programs/services/create-program-with-initial-version";
import { getProgramVersionPublicationReadiness } from "@/features/admin/programs/services/get-program-version-publication-readiness";
import { publishProgramVersion } from "@/features/admin/programs/services/publish-program-version";
import { runProgramVersionTests } from "@/features/admin/programs/services/run-program-version-tests";
import { updateDraftProgramConfiguration } from "@/features/admin/programs/services/update-draft-program-configuration";
import { createDatabaseClient } from "@/server/db/create-database-client";
import { firstVerifiedPrograms, type VerifiedProgramDefinition } from "./data/first-verified-programs";

export async function importVerifiedProgramBatch(definitions: VerifiedProgramDefinition[], options: {
  databaseUrl: string;
  adminEmail: string;
  publish: boolean;
}) {
  const database = createDatabaseClient(options.databaseUrl, { maxConnections: 2 });
  const results: Array<Record<string, unknown>> = [];
  try {
    const admin = await database.adminUser.findUnique({ where: { email: options.adminEmail.toLowerCase() }, select: { id: true, active: true } });
    if (!admin?.active) throw new Error("지정한 활성 ADMIN 계정을 찾을 수 없습니다.");

    for (const definition of definitions) {
      const existing = await database.supportProgram.findUnique({
        where: { slug: definition.create.program.slug },
        select: { id: true, currentPublishedVersionId: true, versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { id: true, publicationStatus: true } } },
      });
      if (existing) {
        results.push({ slug: definition.create.program.slug, action: "SKIPPED_EXISTING", status: existing.versions[0]?.publicationStatus ?? "UNKNOWN" });
        continue;
      }

      const created = await createProgramWithInitialVersion({ ...definition.create, createdById: admin.id }, { database });
      const versionId = created.initialVersion.id;
      await updateDraftProgramConfiguration({ ...definition.configuration, programVersionId: versionId, updatedById: admin.id }, { database });
      const testRun = await runProgramVersionTests({ programVersionId: versionId, executedById: admin.id }, database);
      if (!testRun.overallPassed) throw new Error(`${definition.create.program.slug}: 규칙 테스트 실패`);
      const readiness = await getProgramVersionPublicationReadiness({ programVersionId: versionId }, database);
      if (!readiness.ready) throw new Error(`${definition.create.program.slug}: 게시 준비 조건 실패`);
      if (options.publish) {
        await publishProgramVersion({ programVersionId: versionId, publishedById: admin.id, reason: definition.publicationReason }, database);
      }
      results.push({ slug: definition.create.program.slug, action: options.publish ? "PUBLISHED" : "DRAFT_READY", tests: `${testRun.passedCount}/${testRun.totalCount}`, readiness: readiness.ready });
    }
    return results;
  } finally {
    await database.$disconnect();
  }
}

export function importFirstVerifiedPrograms(options: {
  databaseUrl: string;
  adminEmail: string;
  publish: boolean;
}) {
  return importVerifiedProgramBatch(firstVerifiedPrograms, options);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.LIFEFLOW_DATA_ADMIN_EMAIL;
  if (!databaseUrl) throw new Error("DATABASE_URL 환경 변수가 필요합니다.");
  if (!adminEmail) throw new Error("LIFEFLOW_DATA_ADMIN_EMAIL 환경 변수가 필요합니다.");
  const publish = process.argv.includes("--publish");
  const results = await importFirstVerifiedPrograms({ databaseUrl, adminEmail, publish });
  process.stdout.write(`${JSON.stringify({ mode: publish ? "PUBLISH" : "DRAFT_ONLY", results }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "데이터 입력에 실패했습니다."}\n`);
    process.exitCode = 1;
  });
}
