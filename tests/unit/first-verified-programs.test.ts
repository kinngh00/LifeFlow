import { describe, expect, it } from "vitest";
import { evaluateProgramEligibility } from "@/features/eligibility/engine/eligibility-engine";
import { EligibilityTestInputSchema } from "@/features/eligibility/schemas/eligibility-test-input.schema";
import type { ExecutableEligibilityRule } from "@/features/eligibility/types/eligibility-engine.types";
import { CreateProgramWithInitialVersionSchema } from "@/features/admin/programs/schemas/create-program.schema";
import { UpdateDraftProgramConfigurationSchema } from "@/features/admin/programs/schemas/update-draft-program-configuration.schema";
import { firstVerifiedPrograms } from "../../scripts/data/first-verified-programs";

describe("first verified program batch", () => {
  it("contains five unique official program definitions with at least five tests each", () => {
    expect(firstVerifiedPrograms).toHaveLength(5);
    expect(new Set(firstVerifiedPrograms.map(({ create }) => create.program.slug)).size).toBe(5);

    for (const definition of firstVerifiedPrograms) {
      expect(() => CreateProgramWithInitialVersionSchema.parse({ ...definition.create, createdById: "admin" })).not.toThrow();
      expect(() => UpdateDraftProgramConfigurationSchema.parse({
        ...definition.configuration,
        programVersionId: "version",
        updatedById: "admin",
      })).not.toThrow();
      expect(definition.configuration.sources).toHaveLength(1);
      expect(definition.configuration.sources[0]?.isPrimary).toBe(true);
      expect(definition.configuration.testCases.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("reproduces every declared rule test expectation", () => {
    for (const definition of firstVerifiedPrograms) {
      const rules = definition.configuration.rules.map((rule, index) => ({
        ...rule,
        id: `rule-${index + 1}`,
        sourceId: "source-1",
      })) as ExecutableEligibilityRule[];

      for (const testCase of definition.configuration.testCases) {
        const input = EligibilityTestInputSchema.parse(testCase.inputSnapshot);
        const evaluation = evaluateProgramEligibility({
          rules,
          input,
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
          expect(
            evaluation.ruleResults.find(({ displayOrder }) => displayOrder === expected.displayOrder)?.outcome,
            `${definition.create.program.slug}: ${testCase.name}, rule ${expected.displayOrder}`,
          ).toBe(expected.outcome);
        }
      }
    }
  });
});
