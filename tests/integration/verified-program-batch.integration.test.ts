import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { importVerifiedProgramBatch } from "../../scripts/import-first-verified-programs";
import { secondVerifiedPrograms } from "../../scripts/data/second-verified-programs";
import { thirdVerifiedPrograms } from "../../scripts/data/third-verified-programs";
import { disconnectTestDatabase, getTestDatabase, uniqueTestValue } from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database = getTestDatabase();
let scope: IntegrationTestScope;

describe.each([
  ["second", secondVerifiedPrograms],
  ["third", thirdVerifiedPrograms],
] as const)("%s verified program batch import", (_batchName, verifiedPrograms) => {
  beforeEach(() => { scope = new IntegrationTestScope(database); });
  afterEach(async () => scope.cleanup());
  afterAll(disconnectTestDatabase);

  it("publishes all five definitions only after tests and readiness pass", async () => {
    const admin = await scope.createAdmin();
    const suffix = uniqueTestValue("batch").slice(-20);
    const definitions = verifiedPrograms.map((definition) => ({
      ...definition,
      create: {
        ...definition.create,
        program: { ...definition.create.program, slug: `${definition.create.program.slug}-${suffix}` },
      },
      configuration: {
        ...definition.configuration,
        sources: definition.configuration.sources.map((source) => ({
          ...source,
          documentIdentifier: source.documentIdentifier ? `${source.documentIdentifier}-${suffix}` : null,
        })),
      },
    }));

    const results = await importVerifiedProgramBatch(definitions, {
      databaseUrl: process.env.TEST_DATABASE_URL!,
      adminEmail: admin.email,
      publish: true,
    });
    expect(results).toHaveLength(5);
    expect(results.every(({ action, readiness, tests }) => action === "PUBLISHED" && readiness === true && tests === "5/5")).toBe(true);

    const programs = await database.supportProgram.findMany({
      where: { slug: { in: definitions.map(({ create }) => create.program.slug) } },
      include: { currentPublishedVersion: { include: { ruleTestRuns: true, sources: true, ruleTestCases: true } } },
    });
    programs.forEach(({ id }) => scope.trackProgram(id));
    expect(programs).toHaveLength(5);
    for (const program of programs) {
      expect(program.currentPublishedVersion?.publicationStatus).toBe("PUBLISHED");
      expect(program.currentPublishedVersion?.sources).toHaveLength(1);
      expect(program.currentPublishedVersion?.ruleTestCases).toHaveLength(5);
      expect(program.currentPublishedVersion?.ruleTestRuns.at(-1)?.overallPassed).toBe(true);
    }
  });
});
