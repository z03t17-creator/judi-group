import { expect, test } from "@playwright/test";

const PASSWORD = "JudiAdmin!26";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/en/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('[data-testid="login-submit"]:visible').click();
  await page.waitForURL(/\/(en|ar|ckb)\/(dashboard|field)/);
}

test.describe("Judi Phase 5 smoke", () => {
  test("admin sees dashboard KPIs", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop admin path");
    await login(page, "admin@judi.local");
    await expect(page).toHaveURL(/\/en\/dashboard/);
    await expect(page.getByText(/gross sales|net sales|إجمالي|کۆی فرۆشتن/i).first()).toBeVisible();
  });

  test("locale switch to Arabic sets dir=rtl", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop locale check");
    await login(page, "admin@judi.local");
    await page.goto("/ar/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/جودي|لوحة|التقارير|المتاجر/);
  });

  test("locale switch to Kurdish shows Sorani chrome", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop locale check");
    await login(page, "admin@judi.local");
    await page.goto("/ckb/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ckb");
    const body = await page.locator("body").innerText();
    expect(/[پچکگڤۆێڵڕ]|جودی|داشبۆرد/.test(body)).toBe(true);
  });

  test("delegate opens field collection", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop field path");
    await login(page, "delegate@judi.local");
    await expect(page).toHaveURL(/\/en\/field/);
    await page.locator('a[href*="/field/collection"]').first().click();
    await expect(page).toHaveURL(/\/field\/collection/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("mobile field invoice controls present", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");
    await login(page, "delegate@judi.local");
    await page.goto("/en/field/invoice");
    await expect(page.locator('input[placeholder*="Barcode"], input[placeholder*="SKU"], input[placeholder*="barcode"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });
});
