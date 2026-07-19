export type UpdatedDraftProgramConfigurationResult = {
  programVersionId: string;
  publicationStatus: "DRAFT";
  sourceCount: number;
  regionCount: number;
  ruleCount: number;
  testCaseCount: number;
  primarySource: {
    id: string;
    organizationName: string;
    sourceUrl: string;
  };
  updatedAt: string;
  configurationChanged: true;
};
