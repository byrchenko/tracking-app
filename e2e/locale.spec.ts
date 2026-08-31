import { expect, test } from "@playwright/test";

test.describe("locale routing", () => {
  test("redirects the bare root to the default locale (uk)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/uk$/);
    await expect(
      page.getByRole("heading", { name: "Операція «База»" }),
    ).toBeVisible();
  });

  test("serves the English locale at /en", async ({ page }) => {
    await page.goto("/en");
    await expect(
      page.getByRole("heading", { name: "Operation Base" }),
    ).toBeVisible();
  });

  test("switching locale keeps you on the same page", async ({ page }) => {
    await page.goto("/uk");
    await page.getByRole("button", { name: "Eng" }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole("heading", { name: "Operation Base" }),
    ).toBeVisible();
  });

  test("sets the html lang attribute per locale", async ({ page }) => {
    await page.goto("/uk");
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");

    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
