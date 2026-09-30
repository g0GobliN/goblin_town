import { expect, test } from "@playwright/test";

test.describe("smoke — critical surfaces render", () => {
  test("homepage renders SSR content, flowing prose, and lists", async ({ page }) => {
    await page.goto("/");

    // Hero and key sections exist in the initial HTML (no JS needed)
    await expect(page.locator(".info-lockup-title")).toContainText("Vishal Gurung");
    await expect(page.locator("h3", { hasText: "What I build" })).toBeVisible();

    // Prose must FLOW (the <pre> regression): a long sentence stays one line box
    const whyGoblin = page.locator(".info-desc pre", {
      hasText: "Coding, open source",
    });
    await expect(whyGoblin).toBeVisible();
    const box = await whyGoblin.boundingBox();
    const fontSize = await whyGoblin.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // If pre-wrap line breaks were honored, each sentence would be its own
    // short line and the block would be much taller than 6 lines of text.
    const lineHeight = fontSize * 1.9;
    expect(box.height).toBeLessThan(lineHeight * 8);

    // Workshop list is server-rendered with real links (crawlable)
    const workRows = page.locator("#work-list a.info-row");
    await expect(workRows.first()).toBeVisible();
    const firstHref = await workRows.first().getAttribute("href");
    expect(firstHref).toMatch(/^\/work\/[^/]+\/$/);

    // Library list renders (SSR fallback row or real posts)
    await expect(page.locator("#blog-list .info-row").first()).toBeVisible();
  });

  test("game page boots the canvas without errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/game/");
    await expect(page.locator("#room-canvas")).toBeVisible();
    // Boot gate appears then opens — just verify the game script started
    await expect(page.locator(".boot-mark")).toBeVisible();
    // No uncaught exceptions during boot
    expect(errors).toEqual([]);
  });

  test("unknown work slug renders a graceful not-found page", async ({ page }) => {
    await page.goto("/work/definitely-not-a-real-project/");
    await expect(page.locator(".entry-status")).toContainText("No project found");
    await expect(page.locator("a", { hasText: "Back to Workshop" })).toBeVisible();
  });
});
