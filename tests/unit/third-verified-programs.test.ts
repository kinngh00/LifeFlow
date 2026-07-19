import { describe, expect, it } from "vitest";
import { CreateProgramWithInitialVersionSchema } from "@/features/admin/programs/schemas/create-program.schema";
import { UpdateDraftProgramConfigurationSchema } from "@/features/admin/programs/schemas/update-draft-program-configuration.schema";
import { evaluateProgramEligibility } from "@/features/eligibility/engine/eligibility-engine";
import { EligibilityTestInputSchema } from "@/features/eligibility/schemas/eligibility-test-input.schema";
import type { ExecutableEligibilityRule } from "@/features/eligibility/types/eligibility-engine.types";
import { firstVerifiedPrograms } from "../../scripts/data/first-verified-programs";
import { secondVerifiedPrograms } from "../../scripts/data/second-verified-programs";
import { thirdVerifiedPrograms } from "../../scripts/data/third-verified-programs";

describe("third verified program batch", () => {
  it("adds five schema-valid programs without reusing an earlier slug", () => {
    expect(thirdVerifiedPrograms).toHaveLength(5);
    const earlierSlugs = new Set([...firstVerifiedPrograms, ...secondVerifiedPrograms].map(({ create }) => create.program.slug));
    for (const definition of thirdVerifiedPrograms) {
      expect(earlierSlugs.has(definition.create.program.slug)).toBe(false);
      expect(() => CreateProgramWithInitialVersionSchema.parse({ ...definition.create, createdById: "admin" })).not.toThrow();
      expect(() => UpdateDraftProgramConfigurationSchema.parse({ ...definition.configuration, programVersionId: "version", updatedById: "admin" })).not.toThrow();
      expect(definition.configuration.testCases.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("reproduces all 25 declared rule scenarios", () => {
    for (const definition of thirdVerifiedPrograms) {
      const rules = definition.configuration.rules.map((rule, index) => ({ ...rule, id: `rule-${index + 1}`, sourceId: "source-1" })) as ExecutableEligibilityRule[];
      for (const testCase of definition.configuration.testCases) {
        const evaluation = evaluateProgramEligibility({
          rules,
          input: EligibilityTestInputSchema.parse(testCase.inputSnapshot),
          context: {
            applicationType: definition.create.version.applicationType,
            applicationStartDate: definition.create.version.applicationStartDate ?? null,
            applicationEndDate: definition.create.version.applicationEndDate ?? null,
            checkedAt: definition.create.version.checkedAt,
          },
        });
        expect(evaluation.executable, `${definition.create.program.slug}: ${testCase.name}`).toBe(true);
        expect(evaluation.status, `${definition.create.program.slug}: ${testCase.name}`).toBe(testCase.expectedOverallStatus);
        for (const expected of testCase.expectedRuleOutcomes) {
          expect(evaluation.ruleResults.find(({ displayOrder }) => displayOrder === expected.displayOrder)?.outcome).toBe(expected.outcome);
        }
      }
    }
  });
});
