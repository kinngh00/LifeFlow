export type PublishedVersionSummary = {
  id: string;
  versionNumber: number;
  publicationStatus: "PUBLISHED" | "UNPUBLISHED";
  publishedAt: string | null;
};

export type PublishProgramVersionResult = {
  programId: string;
  publishedVersion: PublishedVersionSummary & { publicationStatus: "PUBLISHED"; publishedAt: string };
  previousPublishedVersion: (PublishedVersionSummary & { publicationStatus: "UNPUBLISHED" }) | null;
  currentPublishedVersionId: string;
  publicationEventId: string;
};

export type CreateDraftVersionResult = {
  programId: string;
  sourceVersionId: string;
  draftVersion: {
    id: string;
    versionNumber: number;
    publicationStatus: "DRAFT";
    sourceCount: number;
    regionCount: number;
    ruleCount: number;
    testCaseCount: number;
  };
};
