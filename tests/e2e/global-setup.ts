import { randomBytes, randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { hashAdminPassword } from "@/server/auth/password-core";
import { assertSafeTestDatabaseUrl } from "@/server/db/test-database-url";

export default async function globalSetup() {
  const connectionString = assertSafeTestDatabaseUrl({
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  });
  const email =
    process.env.E2E_ADMIN_EMAIL ?? `e2e-${Date.now()}@lifeflow.test`;
  const password =
    process.env.E2E_ADMIN_PASSWORD ??
    `LifeFlow-e2e-${randomBytes(18).toString("base64url")}`;
  if (!email.startsWith("e2e-") || !email.endsWith("@lifeflow.test")) {
    throw new Error(
      "E2E_ADMIN_EMAIL은 e2e- 접두어와 @lifeflow.test 도메인을 사용해야 합니다.",
    );
  }

  let id: string = randomUUID();
  const client = new Client({ connectionString, connectionTimeoutMillis: 3_000 });

  await client.connect();
  try {
    const migrationNames = (
      await readdir(path.join(process.cwd(), "prisma", "migrations"), {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const migrationResult = await client.query<{
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>(
      'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"',
    );
    const appliedMigrations = new Set(
      migrationResult.rows
        .filter((row) => row.finished_at && !row.rolled_back_at)
        .map((row) => row.migration_name),
    );
    const missingMigrations = migrationNames.filter(
      (migrationName) => !appliedMigrations.has(migrationName),
    );
    if (missingMigrations.length > 0) {
      throw new Error(
        `E2E 테스트 DB에 적용되지 않은 마이그레이션이 있습니다: ${missingMigrations.join(", ")}`,
      );
    }

    const adminResult = await client.query<{ id: string }>(
      'INSERT INTO "AdminUser" ("id","email","passwordHash","displayName","active","createdAt","updatedAt") VALUES ($1,$2,$3,$4,true,now(),now()) ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "displayName" = EXCLUDED."displayName", "active" = true, "updatedAt" = now() RETURNING "id"',
      [id, email, await hashAdminPassword(password), "E2E 관리자"],
    );
    const admin = adminResult.rows[0];
    if (!admin) {
      throw new Error("E2E 임시 관리자 생성 결과를 확인할 수 없습니다.");
    }
    id = admin.id;

    const publicProgram = async (input: {
      slug: string;
      title: string;
      status: "PUBLISHED" | "DRAFT" | "UNPUBLISHED";
      category: "YOUTH_EMPLOYMENT" | "YOUTH_HOUSING";
      ruleType: "AGE" | "MANUAL_REVIEW";
      condition: object;
      archived?: boolean;
      national?: boolean;
    }) => {
      const programId = randomUUID();
      const versionId = randomUUID();
      const sourceId = randomUUID();
      await client.query(
        'INSERT INTO "SupportProgram" ("id","slug","category","managingOrganization","archivedAt","createdById","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now(),now())',
        [programId, input.slug, input.category, "부산광역시 E2E 기관", input.archived ? new Date() : null, id],
      );
      await client.query(
        'INSERT INTO "ProgramVersion" ("id","programId","versionNumber","title","shortDescription","fullDescription","targetSummary","benefitType","amountType","applicationType","applicationMethod","applicationUrl","contactInformation","requiredDocuments","checkedAt","publicationStatus","publishedAt","createdById","createdAt","updatedAt") VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,now(),now())',
        [versionId,programId,input.title,"브라우저 테스트 전용 가상 지원제도","운영 데이터가 아닌 E2E 전용 공식 정보입니다.","부산 청년","서비스","UNDETERMINED","ALWAYS_OPEN","온라인","https://www.busan.go.kr/e2e-apply","E2E 문의",JSON.stringify([]),"2026-07-19",input.status,input.status==="PUBLISHED"?new Date():null,id],
      );
      await client.query(
        'INSERT INTO "ProgramSource" ("id","programVersionId","sourceType","organizationName","documentTitle","sourceUrl","checkedAt","isPrimary","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,now(),now())',
        [sourceId,versionId,"OFFICIAL_PAGE","부산광역시 E2E 기관","E2E 공식 안내",`https://www.busan.go.kr/${input.slug}`,"2026-07-19"],
      );
      await client.query(
        'INSERT INTO "ProgramRegion" ("id","programVersionId","cityCode","districtCode","coverageType","reviewRequired") VALUES ($1,$2,$3,$4,$5,false)',
        [randomUUID(),versionId,input.national?null:"26000",input.national?null:"ALL",input.national?"NATIONAL":"CITY_WIDE"],
      );
      await client.query(
        'INSERT INTO "EligibilityRule" ("id","programVersionId","ruleType","displayOrder","label","description","expectedCondition","required","reviewRequired","missingValueBehavior","passMessage","failureMessage","unknownMessage","sourceId","sourceLocation","active","createdAt","updatedAt") VALUES ($1,$2,$3,1,$4,$5,$6::jsonb,true,$7,$8,$9,$10,$11,$12,$13,true,now(),now())',
        [randomUUID(),versionId,input.ruleType,"E2E 자격 규칙",input.ruleType==="AGE"?"연령 조건":"기관 확인 조건",JSON.stringify(input.condition),input.ruleType==="MANUAL_REVIEW","UNKNOWN","조건을 충족합니다.","조건을 충족하지 않습니다.","공식 기관 확인이 필요합니다.",sourceId,"지원 대상"],
      );
      await client.query('UPDATE "SupportProgram" SET "currentPublishedVersionId"=$1 WHERE "id"=$2',[versionId,programId]);
    };
    const seed = Date.now();
    const eligibleSlug = `e2e-public-eligible-${seed}`;
    await publicProgram({slug:eligibleSlug,title:"E2E 취업 신청 가능 제도",status:"PUBLISHED",category:"YOUTH_EMPLOYMENT",ruleType:"AGE",condition:{minimumAge:19,maximumAge:34,referenceDate:"APPLICATION_DATE"},national:true});
    await publicProgram({slug:`e2e-public-review-${seed}`,title:"E2E 주거 추가 확인 제도",status:"PUBLISHED",category:"YOUTH_HOUSING",ruleType:"MANUAL_REVIEW",condition:{reviewPrompt:"기관 확인 필요"}});
    await publicProgram({slug:`e2e-public-fail-${seed}`,title:"E2E 연령 미충족 제도",status:"PUBLISHED",category:"YOUTH_EMPLOYMENT",ruleType:"AGE",condition:{minimumAge:50,referenceDate:"APPLICATION_DATE"}});
    await publicProgram({slug:`e2e-public-draft-${seed}`,title:"E2E 비공개 DRAFT",status:"DRAFT",category:"YOUTH_EMPLOYMENT",ruleType:"AGE",condition:{minimumAge:19,maximumAge:34,referenceDate:"APPLICATION_DATE"}});
    await publicProgram({slug:`e2e-public-unpublished-${seed}`,title:"E2E 비공개 이력",status:"UNPUBLISHED",category:"YOUTH_EMPLOYMENT",ruleType:"AGE",condition:{minimumAge:19,maximumAge:34,referenceDate:"APPLICATION_DATE"}});
    await publicProgram({slug:`e2e-public-archived-${seed}`,title:"E2E 보관 제도",status:"PUBLISHED",category:"YOUTH_EMPLOYMENT",ruleType:"AGE",condition:{minimumAge:19,maximumAge:34,referenceDate:"APPLICATION_DATE"},archived:true});
    process.env.E2E_PUBLIC_ELIGIBLE_SLUG = eligibleSlug;
  } finally {
    await client.end();
  }

  process.env.E2E_ADMIN_ID = id;
  process.env.E2E_ADMIN_EMAIL = email;
  process.env.E2E_ADMIN_PASSWORD = password;
}
