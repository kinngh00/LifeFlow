import { expect, test as base } from "@playwright/test";

export { expect };

export const test = base.extend<{ browserErrorGuard: void }>({
  browserErrorGuard: [
    async ({ page }, use) => {
      const browserErrors: string[] = [];
      let receivedExpectedMissingQuestionnaireResponse = false;

      page.on("console", (message) => {
        if (message.type() === "error") {
          browserErrors.push(`console: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => {
        browserErrors.push(`pageerror: ${error.message}`);
      });
      page.on("response", (response) => {
        if (response.status() < 400) return;

        const url = new URL(response.url());
        const isExpectedInvalidLogin =
          response.status() === 401 &&
          url.pathname === "/api/admin/auth/login";
        const isExpectedMissingQuestionnaire =
          response.status() === 400 &&
          url.pathname === "/api/recommendations/evaluate";
        if (isExpectedMissingQuestionnaire) {
          receivedExpectedMissingQuestionnaireResponse = true;
        }
        if (!isExpectedInvalidLogin && !isExpectedMissingQuestionnaire) {
          browserErrors.push(
            `http: ${response.status()} ${response.request().method()} ${url.pathname}`,
          );
        }
      });

      await use();

      const unexpectedBrowserErrors = browserErrors.filter((error) => {
        const isExpectedResourceError =
          receivedExpectedMissingQuestionnaireResponse &&
          error ===
            "console: Failed to load resource: the server responded with a status of 400 (Bad Request)";

        return !isExpectedResourceError;
      });

      expect(
        unexpectedBrowserErrors,
        "브라우저 또는 HTTP 오류가 없어야 합니다.",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
