import type { PrismaClient } from "@/generated/prisma/client";
import { uniqueTestValue } from "./database";

export class IntegrationTestScope {
  readonly adminIds: string[] = [];
  readonly programIds: string[] = [];

  constructor(private readonly database: PrismaClient) {}

  async createAdmin(active = true, passwordHash = "x".repeat(60)) {
    const unique = uniqueTestValue("test-admin");
    const admin = await this.database.adminUser.create({
      data: {
        email: `${unique}@example.com`,
        passwordHash,
        displayName: unique,
        active,
      },
    });
    this.adminIds.push(admin.id);
    return admin;
  }

  trackProgram(programId: string) {
    this.programIds.push(programId);
  }

  async createProgramWithVersion(
    adminId: string,
    publicationStatus: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED" = "DRAFT",
  ) {
    const unique = uniqueTestValue("test-program");
    const program = await this.database.supportProgram.create({
      data: {
        slug: unique,
        category: "YOUTH_EMPLOYMENT",
        managingOrganization: "부산광역시 테스트 기관",
        createdById: adminId,
        versions: {
          create: {
            versionNumber: 1,
            title: `${unique} 버전`,
            shortDescription: "테스트 요약",
            fullDescription: "테스트 상세",
            targetSummary: "부산 청년",
            benefitType: "서비스",
            amountType: "UNDETERMINED",
            applicationType: "ALWAYS_OPEN",
            applicationMethod: "온라인",
            contactInformation: "테스트 담당자",
            requiredDocuments: [],
            checkedAt: new Date("2026-07-19T00:00:00.000Z"),
            publicationStatus,
            createdById: adminId,
          },
        },
      },
      include: { versions: true },
    });
    this.programIds.push(program.id);
    return { program, version: program.versions[0]! };
  }

  async cleanup(): Promise<void> {
    if (this.programIds.length > 0) {
      const versions = await this.database.programVersion.findMany({
        where: { programId: { in: this.programIds } },
        select: { id: true },
      });
      const versionIds = versions.map(({ id }) => id);

      await this.database.supportProgram.updateMany({
        where: { id: { in: this.programIds } },
        data: { currentPublishedVersionId: null },
      });
      if (versionIds.length > 0) {
        const runs = await this.database.ruleTestRun.findMany({
          where: { programVersionId: { in: versionIds } },
          select: { id: true },
        });
        const runIds = runs.map(({ id }) => id);
        if (runIds.length > 0) {
          await this.database.ruleTestResult.deleteMany({
            where: { testRunId: { in: runIds } },
          });
        }
        await this.database.ruleTestRun.deleteMany({
          where: { programVersionId: { in: versionIds } },
        });
        await this.database.ruleTestCase.deleteMany({
          where: { programVersionId: { in: versionIds } },
        });
        await this.database.eligibilityRule.deleteMany({
          where: { programVersionId: { in: versionIds } },
        });
        await this.database.programRegion.deleteMany({
          where: { programVersionId: { in: versionIds } },
        });
        await this.database.programSource.deleteMany({
          where: { programVersionId: { in: versionIds } },
        });
        await this.database.publicationEvent.deleteMany({
          where: { programVersionId: { in: versionIds } },
        });
        await this.database.adminAuditLog.deleteMany({
          where: { entityType: "ProgramVersion", entityId: { in: versionIds } },
        });
      }
      await this.database.programVersion.deleteMany({
        where: { programId: { in: this.programIds } },
      });
      await this.database.supportProgram.deleteMany({
        where: { id: { in: this.programIds } },
      });
    }

    if (this.adminIds.length > 0) {
      await this.database.adminSession.deleteMany({
        where: { adminUserId: { in: this.adminIds } },
      });
      await this.database.adminAuditLog.deleteMany({
        where: { adminUserId: { in: this.adminIds } },
      });
      await this.database.adminUser.deleteMany({
        where: { id: { in: this.adminIds } },
      });
    }
  }
}
