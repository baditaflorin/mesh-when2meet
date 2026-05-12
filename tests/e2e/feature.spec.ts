import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("painting a cell on peer A appears on peer B via mesh sync", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Both peers set a display name so the cell knows whose vote it is.
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");

    // Alice paints Mon-08 (first cell in the grid).
    const firstCell = a.locator(".when-cell").first();
    await firstCell.click();

    // Bob should see "1" appear in the same cell within mesh sync window.
    await expect(b.locator(".when-cell").first()).toHaveText("1");
  } finally {
    await cleanup();
  }
});

test("name persists to localStorage across reload", async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "");
  await page.getByPlaceholder("your name").fill("charlie");
  await page.reload();
  await expect(page.getByPlaceholder("your name")).toHaveValue("charlie");
});
