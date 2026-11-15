import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { test, expect } from "@playwright/test";
const nav = (page: import("@playwright/test").Page, name: RegExp | string) =>
  page.getByRole("navigation").getByRole("button", { name });
async function kit(page: import("@playwright/test").Page) {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Připravená sada", exact: true })
    .click();
  await page.getByRole("button", { name: /Sloveso To Be/ }).click();
}

test("large set keeps selected 3D model visible and colour follows category", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await kit(page);
  await nav(page, /Kostky/).click();
  await expect(page.locator(".brick-detail h3")).toHaveText("I");
  const canvas = page.locator(".brick-detail canvas");
  await expect(canvas).toBeInViewport();
  const bounds = await canvas.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(768);
  expect(bounds!.height).toBeLessThan(400);
  await page.getByRole("button", { name: "am Sloveso", exact: true }).click();
  await expect(page.locator(".brick-detail h3")).toHaveText("am");
  await page
    .getByLabel("Slovní druh: am", { exact: true })
    .selectOption("noun");
  await expect(
    page
      .getByRole("button", { name: "am Podstatné jméno", exact: true })
      .locator("i"),
  ).toHaveCSS("background-color", "rgb(68, 184, 138)");
  await page.getByLabel("Počet: am", { exact: true }).fill("3");
  await nav(page, "Nastavení").click();
  await nav(page, /Kostky/).click();
  await expect(page.getByLabel("Počet: am", { exact: true })).toHaveValue("3");
  await page.getByRole("button", { name: /Obnovit vypočtený počet/ }).click();
  await expect(page.getByLabel("Počet: am", { exact: true })).toHaveValue("1");
  await page
    .getByLabel("Slovní druh: am", { exact: true })
    .selectOption("verb");
  for (const scene of await page.locator(".canvas-wrap").all())
    await expect(scene).toHaveAttribute("data-ready", "true");
  await page.screenshot({ path: test.info().outputPath("bricks-desktop.png") });
});

test("print bed is readable, shares screen with export and downloads work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await kit(page);
  await nav(page, "Tisk a export").click();
  const bounds = await page.locator(".bed").boundingBox();
  expect(bounds!.width).toBeGreaterThan(250);
  expect(bounds!.y + bounds!.height).toBeLessThan(768);
  await expect(
    page.getByRole("button", { name: "Stáhnout celou sadu (ZIP)" }),
  ).toBeInViewport();
  await page.getByLabel("Přidat samostatné STL těla a textu").check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Stáhnout celou sadu (ZIP)" }).click();
  expect((await download).suggestedFilename()).toBe("wordbricklab-export.zip");
  const single = page.waitForEvent("download");
  await page.getByRole("button", { name: "Stáhnout pouze „I“ (STL)" }).click();
  expect((await single).suggestedFilename()).toMatch(
    /^I-full|^I-brick|^i-brick/i,
  );
  for (const scene of await page.locator(".canvas-wrap").all())
    await expect(scene).toHaveAttribute("data-ready", "true");
  await page.screenshot({ path: test.info().outputPath("print-desktop.png") });
});

test("all settings expanded, retain values between tabs, multi-plate navigation", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Nastavení").click();
  await expect(
    page.getByLabel("Tloušťka stěny", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Vnitřní průměr trubičky", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Pokročilé|Advanced/ }),
  ).toHaveCount(0);
  await page.getByLabel("Velikost písma", { exact: true }).fill("6");
  await page.getByLabel("Šířka podložky", { exact: true }).fill("100");
  await page.getByLabel("Hloubka podložky", { exact: true }).fill("200");
  await nav(page, "Obsah").click();
  await page.getByLabel("Věty", { exact: true }).fill("I am ready.");
  await nav(page, /Kostky/).click();
  await page.getByLabel("Počet: I", { exact: true }).fill("100");
  await nav(page, "Tisk a export").click();
  const rectangularBed = await page.locator(".bed").boundingBox();
  expect(rectangularBed!.width / rectangularBed!.height).toBeCloseTo(0.5, 1);
  await expect(
    page.getByRole("button", { name: "Další podložka" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Další podložka" }).click();
  await expect(page.locator(".plate-navigation")).toContainText("Podložka 2");
  await page.getByRole("button", { name: "Předchozí podložka" }).click();
  await expect(page.locator(".plate-navigation")).toContainText("Podložka 1");
  await nav(page, "Nastavení").click();
  await expect(page.getByLabel("Velikost písma", { exact: true })).toHaveValue(
    "6",
  );
  await expect(
    page.getByRole("button", { name: /Nacvakávací štítek/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Obnovit výchozí nastavení" }).click();
  await expect(page.getByLabel("Velikost písma", { exact: true })).toHaveValue(
    "7",
  );
  for (const scene of await page.locator(".canvas-wrap").all())
    await expect(scene).toHaveAttribute("data-ready", "true");
  await page.screenshot({
    path: test.info().outputPath("settings-desktop.png"),
  });
});

test("draft autosaves, project round trip and locale remain consistent", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Věty", { exact: true }).fill("I have a cat.");
  await expect(page.locator(".preview-caption")).toContainText("5");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Soukromí", exact: true }).click();
  await page
    .getByRole("button", { name: "Zapnout ukládání v tomto prohlížeči" })
    .click();
  await page.getByRole("button", { name: "Zavřít", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Věty", { exact: true })).toHaveValue(
    "I have a cat.",
  );
  await nav(page, "Tisk a export").click();
  await page.getByLabel("Název projektu").fill("Moje sada");
  const saved = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Uložit projekt", exact: true })
    .click();
  const projectDownload = await saved;
  const projectFile = {
    name: projectDownload.suggestedFilename(),
    mimeType: "application/json",
    buffer: await readFile(await projectDownload.path()),
  };
  await nav(page, "Obsah").click();
  await page.getByLabel("Věty", { exact: true }).fill("You are here.");
  await nav(page, "Tisk a export").click();
  await page
    .getByLabel("Načíst projekt", { exact: true })
    .setInputFiles(projectFile);
  await expect(page.getByRole("status")).toContainText("Projekt byl načten");
  await nav(page, "Obsah").click();
  await expect(page.getByLabel("Věty", { exact: true })).toHaveValue(
    "I have a cat.",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(nav(page, "Settings")).toBeVisible();
  await nav(page, "Settings").click();
  await expect(
    page.getByLabel("Global font size", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Turn off saving and delete the saved project",
    })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "was deleted",
  );
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("previously saved projects are restored on request", async ({ page }) => {
  const sample = await readFile("samples/to-be.wordbrick.json", "utf8");
  await page.addInitScript((raw) => {
    localStorage.setItem("wordbricklab.project.v1", raw);
  }, sample);
  await page.goto("./");
  await expect(page.getByLabel("Věty", { exact: true })).toHaveValue(
    "I am ready.\nYou are at home.",
  );
  await page.getByRole("button", { name: "Soukromí", exact: true }).click();
  await page.getByRole("button", { name: "Obnovit uložený projekt" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Privacy", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(1);
});

test("legacy tile project exports classic bricks", async ({ page }) => {
  const sample = JSON.parse(
    await readFile("samples/to-be.wordbrick.json", "utf8"),
  );
  sample.locale = "cs";
  sample.geometry.construction = "snapTile";
  sample.geometry.tileHeight = 3.2;

  await page.goto("./");
  await nav(page, "Tisk a export").click();
  await page.getByLabel("Načíst projekt", { exact: true }).setInputFiles({
    name: "legacy.wordbrick.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(sample)),
  });
  await expect(page.getByRole("status")).toContainText("Projekt byl načten");

  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Stáhnout celou sadu (ZIP)" }).click();
  const files = unzipSync(await readFile(await (await downloaded).path()));
  const manifest = JSON.parse(strFromU8(files["manifest.json"]!)) as {
    parts: { construction: string; dimensionsMm: number[]; file: string }[];
  };
  expect(manifest.parts.length).toBeGreaterThan(0);
  for (const part of manifest.parts) {
    expect(part.construction).toBe("fullBrick");
    expect(part.dimensionsMm[2]).toBeCloseTo(9.6 + sample.geometry.textHeight);
    expect(part.file).toMatch(/-brick-2x\d+\.stl$/);
  }
});

test("empty content and oversize words explain why export is unavailable", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Věty", { exact: true }).fill("");
  await nav(page, "Tisk a export").click();
  await expect(page.getByText("Podložka je zatím prázdná")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Stáhnout celou sadu (ZIP)" }),
  ).toBeDisabled();
  await nav(page, "Obsah").click();
  await page.getByLabel("Věty", { exact: true }).fill("W".repeat(200));
  await nav(page, "Tisk a export").click();
  await expect(page.getByRole("alert")).toContainText("Některá slova");
  await expect(
    page.getByRole("button", { name: "Stáhnout celou sadu (ZIP)" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Zkontrolovat kostky" }).click();
  await expect(page.locator(".row-error")).toBeVisible();
});

for (const width of [390, 320])
  test(`mobile ${width}: model stays with list and every tab fits`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await kit(page);
    await nav(page, /Kostky/).click();
    await expect(page.locator(".brick-detail canvas")).toBeInViewport();
    await page
      .getByRole("button", { name: "you Zájmeno", exact: true })
      .click();
    await expect(page.locator(".brick-detail h3")).toHaveText("you");
    await expect(page.locator(".brick-detail canvas")).toBeInViewport();
    for (const scene of await page.locator(".canvas-wrap").all())
      await expect(scene).toHaveAttribute("data-ready", "true");
    await page.screenshot({
      path: test.info().outputPath("bricks-mobile.png"),
    });
    for (const name of ["Tisk a export", "Nastavení", "Obsah"]) {
      await nav(page, name).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const scene of await page.locator(".canvas-wrap").all())
        await expect(scene).toHaveAttribute("data-ready", "true");
      await page.screenshot({
        path: test
          .info()
          .outputPath(
            name === "Obsah"
              ? "content-mobile.png"
              : name === "Nastavení"
                ? "settings-mobile.png"
                : "print-mobile.png",
          ),
      });
    }
  });

test("ZIP keeps separate geometry for punctuation with the same sanitized filename", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByLabel("Věty", { exact: true }).fill("I am ready. Are you?");
  await nav(page, /Tisk/).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Stáhnout celou sadu (ZIP)" }).click();
  const path = await (await downloaded).path();
  expect(path).toBeTruthy();
  const files = unzipSync(await readFile(path!));
  const manifest = JSON.parse(strFromU8(files["manifest.json"]!)) as {
    parts: { text: string; file: string }[];
  };
  const punctuation = manifest.parts.filter(
    ({ text }) => text === "." || text === "?",
  );
  expect(punctuation).toHaveLength(2);
  const copies = punctuation.map(({ file }) => {
    const copy = file
      .replace("bricks/", "quantities/")
      .replace(/-2x2\.stl$/, "-01-of-01.stl");
    expect(files[copy]).toEqual(files[file]);
    return files[copy];
  });
  expect(copies[0]).not.toEqual(copies[1]);
});

test("switching sentence sources preserves an uncommitted draft", async ({
  page,
}) => {
  await page.goto("./");
  const sentences = page.getByLabel("Věty", { exact: true });
  await sentences.evaluate((input, next) => {
    const textarea = input as HTMLTextAreaElement;
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(textarea, next);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent === "Připravená sada")!
      .click();
  }, "My draft stays here.");
  await page.getByRole("button", { name: "Vlastní věty", exact: true }).click();
  await expect(sentences).toHaveValue("My draft stays here.");
});

test("export can recover from worker load failure and cancellation", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "Tisk a export").click();
  const download = page.getByRole("button", {
    name: "Stáhnout celou sadu (ZIP)",
  });
  const workerUrl = /geometry\.worker(?:-[^/]+\.js|\.ts)(?:\?.*)?$/;
  await page.route(workerUrl, (route) => route.abort(), { times: 1 });
  await download.click();
  await expect(page.locator(".notice")).toContainText(
    "Export se nepodařilo spustit",
  );
  await expect(download).toBeEnabled();

  await page.route(
    workerUrl,
    (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "self.onmessage = () => {};",
      }),
    { times: 1 },
  );
  await download.click();
  await page.getByRole("button", { name: "Zrušit", exact: true }).click();
  await expect(download).toBeEnabled();

  const finished = page.waitForEvent("download");
  await download.click();
  expect((await finished).suggestedFilename()).toBe("wordbricklab-export.zip");
});
