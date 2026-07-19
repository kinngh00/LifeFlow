import { expect, test } from "./fixtures";

test("랜딩 페이지를 표시한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "내 상황에 맞는 지원을",
  );
});

test("조건 입력 UI 골격을 표시한다", async ({ page }) => {
  await page.goto("/questionnaire");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "나에게 필요한 지원 분야를 알려주세요",
  );
  await expect(page.getByRole("button", { name: "다음 단계" })).toBeDisabled();
});

test("관리자 로그인 폼을 표시한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("관리자 로그인");
  await expect(page.getByRole("button", { name: "로그인" })).toBeEnabled();
  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
});
