import { expect, test } from "@playwright/test";

test("home page loads with the headline and search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your next home in Kenya");
  await expect(page.getByRole("search")).toBeVisible();
});

test("search page loads", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("sign-in offers Google and phone sign-in and a way home", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in with phone/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible();
});

test("sign-up requires accepting the terms", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByLabel(/i am 18 or older/i)).toBeVisible();
});

for (const slug of ["terms", "privacy", "cookies", "community-standards", "review-policy", "acceptable-use", "disclaimer"]) {
  test(`legal page ${slug} loads`, async ({ page }) => {
    const res = await page.goto(`/legal/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("information pages load", async ({ page }) => {
  for (const p of ["/about", "/how-it-works", "/safety", "/contact", "/for-landlords", "/counties", "/student-housing"]) {
    const res = await page.goto(p); expect(res?.status(), p).toBeLessThan(400);
  }
});

test("a county page loads", async ({ page }) => {
  const res = await page.goto("/houses-for-rent/kakamega"); expect(res?.status()).toBe(200);
});

test("unknown page shows the not-found page", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist"); expect(res?.status()).toBe(404);
});

test("sitemap and robots exist", async ({ request }) => {
  expect((await request.get("/sitemap.xml")).ok()).toBe(true);
  expect((await request.get("/robots.txt")).ok()).toBe(true);
});

test("protected pages send visitors to sign in", async ({ page }) => {
  await page.goto("/dashboard"); await expect(page).toHaveURL(/sign-in/);
  await page.goto("/admin"); await expect(page).toHaveURL(/sign-in|\/$/);
});

test("the theme can be changed without signing in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /change theme/i }).click();
  await page.getByRole("menuitemradio", { name: /light/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
