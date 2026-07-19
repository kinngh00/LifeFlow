-- Add NATIONAL as an applicant-residence coverage option. This does not describe
-- the program's managing authority or delivery area.
ALTER TYPE "RegionCoverageType" ADD VALUE 'NATIONAL' BEFORE 'CITY_WIDE';

-- NATIONAL has no city or district code, so both columns must accept null.
ALTER TABLE "ProgramRegion"
  ALTER COLUMN "cityCode" DROP NOT NULL,
  ALTER COLUMN "districtCode" DROP DEFAULT,
  ALTER COLUMN "districtCode" DROP NOT NULL;

-- Replace the nullable-unsafe composite unique index with coverage-specific indexes.
DROP INDEX "ProgramRegion_programVersionId_cityCode_districtCode_key";

CREATE UNIQUE INDEX "ProgramRegion_one_national_per_version_idx"
  ON "ProgramRegion"("programVersionId")
  WHERE "coverageType" = 'NATIONAL';

CREATE UNIQUE INDEX "ProgramRegion_one_city_wide_per_version_idx"
  ON "ProgramRegion"("programVersionId")
  WHERE "coverageType" = 'CITY_WIDE';

CREATE UNIQUE INDEX "ProgramRegion_one_district_per_version_idx"
  ON "ProgramRegion"("programVersionId", "districtCode")
  WHERE "coverageType" = 'DISTRICT';

-- Keep the persisted shape aligned with the applicant-residence meaning:
-- NATIONAL has no codes, CITY_WIDE is all of Busan, and DISTRICT is one of
-- Busan's 16 district/county codes.
ALTER TABLE "ProgramRegion"
  ADD CONSTRAINT "program_region_coverage_shape_check"
  CHECK (
    ("coverageType" = 'NATIONAL' AND "cityCode" IS NULL AND "districtCode" IS NULL)
    OR
    ("coverageType" = 'CITY_WIDE' AND "cityCode" = '26000' AND "districtCode" = 'ALL')
    OR
    (
      "coverageType" = 'DISTRICT'
      AND "cityCode" = '26000'
      AND "districtCode" IN (
        '26110', '26140', '26170', '26200', '26230', '26260', '26290', '26320',
        '26350', '26380', '26410', '26440', '26470', '26500', '26530', '26710'
      )
    )
  );
