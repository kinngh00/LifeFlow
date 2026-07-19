import { expect, test } from "./fixtures";

test("세션이 없으면 추천 화면에서 조건 입력을 안내한다", async ({ page }) => {
  await page.goto("/benefits");
  await expect(page.getByText("조건 입력을 먼저 완료해 주세요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "조건 입력 시작" })).toBeVisible();
});

test("비회원 설문부터 추천·상세·수정·초기화까지 완료한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "조건 입력 화면 보기" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("생년월일", { exact: true }).fill("2000-01-01");
  await page.getByLabel("거주 지역").selectOption("11000");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("현재 취업 상태").selectOption("UNEMPLOYED");
  await page.getByLabel("현재 구직 중인가요?").selectOption("YES");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("학생 상태").selectOption("GRADUATED");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("가구원 수").selectOption("1");
  await page.getByLabel("기준 중위소득 구간").selectOption("100% 이하");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("주거 형태").selectOption("MONTHLY_RENT");
  await page.getByLabel("주택 소유").selectOption("NO_HOME");
  await page.getByLabel("가구주 여부").selectOption("HEAD");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("청년 취업 지원").check();
  await page.getByLabel("청년 주거 지원").check();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("2000-01-01")).toBeVisible();
  await page.getByRole("button", { name: "추천 결과 보기" }).click();
  await expect(page).toHaveURL(/\/benefits$/);
  await expect(page.getByText("E2E 취업 신청 가능 제도")).toBeVisible();
  const eligibleCard = page.getByRole("article").filter({ hasText: "E2E 취업 신청 가능 제도" });
  await expect(eligibleCard.getByText("거주지 제한: 부산 거주 필수 아님")).toBeVisible();
  await expect(page.getByText("E2E 주거 추가 확인 제도")).toBeVisible();
  await page.getByLabel("상태 필터").selectOption("NOT_ELIGIBLE");
  await expect(page.getByText("E2E 연령 미충족 제도")).toBeVisible();
  await expect(page.getByText("E2E 비공개 DRAFT")).not.toBeVisible();

  await page.goto(`/benefits/${process.env.E2E_PUBLIC_ELIGIBLE_SLUG}`);
  await expect(page.getByText("거주지 제한: 부산 거주 필수 아님")).toBeVisible();
  await expect(page.getByText("AGE")).toBeVisible();
  await expect(page.getByText("조건을 충족합니다.")).toBeVisible();
  const official = page.getByRole("link", { name: /E2E 공식 안내/ });
  await expect(official).toHaveAttribute("rel", "noopener noreferrer");

  await page.goto("/questionnaire");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByLabel("생년월일", { exact: true })).toHaveValue("2000-01-01");
  await page.getByLabel("생년월일", { exact: true }).fill("1960-01-01");
  for (let index = 0; index < 6; index += 1) {
    await page.getByRole("button", { name: "다음" }).click();
  }
  await page.getByRole("button", { name: "추천 결과 보기" }).click();
  await expect(page).toHaveURL(/\/benefits$/);
  const changed = page.getByRole("article").filter({ hasText: "E2E 취업 신청 가능 제도" });
  await expect(changed.getByText("신청 가능성 낮음")).toBeVisible();

  await confirmNextDialog(page);
  await page.getByRole("button", { name: "전체 초기화" }).click();
  await expect(page).toHaveURL(/\/questionnaire$/);
  await page.goto("/benefits");
  await expect(page.getByText("조건 입력을 먼저 완료해 주세요.")).toBeVisible();
  const viewport = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
});

function confirmNextDialog(page: import("@playwright/test").Page) {
  page.once("dialog", (dialog) => dialog.accept());
}
