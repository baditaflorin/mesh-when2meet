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

test("A and B mark different slots plus a shared one → both see the merged heatmap", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Distinct identities so the two votes land under different keys in the
    // shared slot's Y.Map (a row keyed by peer key, not by peerId).
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");

    // Grid cells, after the day-label header row, are row-major over
    // HOURS × DAYS: index 0 = Mon-08, 1 = Tue-08, … 6 = Sun-08, 7 = Mon-09.
    const SHARED = 0; // Mon-08 — both peers mark this → overlap count 2
    const ONLY_A = 1; // Tue-08 — only alice
    const ONLY_B = 2; // Wed-08 — only bob

    const cellsA = a.locator(".when-cell");
    const cellsB = b.locator(".when-cell");

    // Alice marks the shared slot and her solo slot.
    await cellsA.nth(SHARED).click();
    await cellsA.nth(ONLY_A).click();

    // Bob marks the shared slot and his solo slot.
    await cellsB.nth(SHARED).click();
    await cellsB.nth(ONLY_B).click();

    // The merged heatmap must be identical on BOTH screens: the shared slot
    // reads "2" (alice + bob overlap), each solo slot reads "1".
    for (const cells of [cellsA, cellsB]) {
      await expect(cells.nth(SHARED)).toHaveText("2");
      await expect(cells.nth(ONLY_A)).toHaveText("1");
      await expect(cells.nth(ONLY_B)).toHaveText("1");
    }

    // And the overlap is attributed to both names cross-peer: on A's screen
    // the shared cell's title lists both voters (merge, not last-writer-wins).
    await expect(cellsA.nth(SHARED)).toHaveAttribute("title", /alice/);
    await expect(cellsA.nth(SHARED)).toHaveAttribute("title", /bob/);
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
