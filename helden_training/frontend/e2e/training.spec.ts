import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

test("complete training flow through an Ingress prefix", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/api/hassio_ingress/test-token/");
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Profil anlegen", exact: true })
    .click();
  const profileName = `Steffi ${testInfo.project.name}`;
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill(profileName);
  await page.getByRole("button", { name: "Profil speichern" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Übungsbibliothek" }).click();
  await page.getByRole("button", { name: "Übung hinzufügen" }).click();
  await page
    .getByLabel("Übungsname")
    .fill(`Kniebeuge ${testInfo.project.name}`);
  await page.getByLabel("Geräte", { exact: true }).fill("Kurzhanteln");
  await page
    .getByLabel("Ausführung und Hinweise")
    .fill("Kontrolliert absenken.");
  await page.getByRole("button", { name: "Übung speichern" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Trainingspläne", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Plan erstellen", exact: true })
    .click();
  await page
    .getByLabel("Name des Plans")
    .fill(`Ganzkörper ${testInfo.project.name}`);
  await page.getByRole("combobox", { name: "Übung hinzufügen" }).selectOption({
    label: `Kniebeuge ${testInfo.project.name} · Ganzer Körper`,
  });
  await page.getByRole("dialog").locator(".add-exercise button").click();
  await page.getByLabel("Sätze", { exact: true }).fill("2");
  await page.getByLabel("Gewicht (kg)", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Plan speichern" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".plan-card")
    .filter({ hasText: `Ganzkörper ${testInfo.project.name}` })
    .getByRole("button", { name: "Training starten" })
    .click();
  await page.getByLabel("Gewicht Satz 1", { exact: true }).fill("22.5");
  await page.getByLabel("Wiederholungen Satz 1", { exact: true }).fill("8");
  await page.getByLabel("Notiz Satz 1", { exact: true }).fill("Sauber");
  await page
    .getByRole("button", { name: "Satz 1 speichern", exact: true })
    .click();
  await expect(page.locator(".set-row.saved")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Fortsetzen", exact: true }).click();
  await expect(page.getByLabel("Gewicht Satz 1", { exact: true })).toHaveValue(
    "22.5",
  );
  await expect(page.getByLabel("Notiz Satz 1", { exact: true })).toHaveValue(
    "Sauber",
  );
  await page
    .getByRole("button", { name: "Satz 2 speichern", exact: true })
    .click();
  await expect(page.locator(".set-row.saved")).toHaveCount(2);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Training abschließen" }).click();
  await expect(
    page.getByText("Training abgeschlossen", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mein Verlauf", exact: true }).click();
  await expect(
    page
      .locator(".history-row")
      .filter({ hasText: `Ganzkörper ${testInfo.project.name}` }),
  ).toContainText("380 kg");
  await page.getByRole("button", { name: "Übersicht", exact: true }).click();
  await page.screenshot({
    path: `test-results/overview-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

for (const format of ["mp4", "mov"] as const) {
  test(`${format.toUpperCase()} upload and relative video URL`, async ({
    page,
  }, testInfo) => {
    await page.goto("/api/hassio_ingress/test-token/");
    await page.getByRole("button", { name: "Übungsbibliothek" }).click();
    await page.getByRole("button", { name: "Übung hinzufügen" }).click();
    await page
      .getByLabel("Übungsname")
      .fill(`Video ${format} ${testInfo.project.name}`);
    await page.locator("input[type=file]").setInputFiles({
      name: `test.${format.toUpperCase()}`,
      mimeType: format === "mov" ? "" : "video/mp4",
      buffer: Buffer.from(
        format === "mov"
          ? "000000186674797071742020000000007174202000000000"
          : "000000186674797069736f6d0000000069736f6d6d703432",
        "hex",
      ),
    });
    await page.getByRole("button", { name: "Übung speichern" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", {
        name: `Video ${format} ${testInfo.project.name} ansehen`,
        exact: true,
      })
      .click();
    const source = await page.locator("video").getAttribute("src");
    expect(source).toContain("/api/hassio_ingress/test-token/api/exercises/");
    const result = await page.request.get(source!);
    expect(result.status()).toBe(200);
    expect(result.headers()["content-type"]).toBe(
      format === "mov" ? "video/quicktime" : "video/mp4",
    );
    // Container fixture only. Playback codec validation is a separate manual check.
  });
}

test("large MOV survives proxy size limit, slow transfer and lost response", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const freeAtom = Buffer.alloc(8);
  freeAtom.writeUInt32BE(17 * 1024 * 1024 + 8, 0);
  freeAtom.write("free", 4);
  const payload = Buffer.concat([
    readFileSync("../../tests/fixtures/hevc-main10-12s.mov"),
    freeAtom,
    Buffer.alloc(17 * 1024 * 1024),
  ]);
  let dropFirstResponse = true;
  let largestRequest = 0;
  let retries = 0;
  await page.route("**/api/video-uploads/*", async (route) => {
    if (
      route.request().method() !== "POST" ||
      new URL(route.request().url()).pathname.endsWith("/finish")
    ) {
      await route.continue();
      return;
    }
    largestRequest = Math.max(
      largestRequest,
      route.request().postDataBuffer()?.length || 0,
    );
    if (testInfo.project.name === "desktop")
      await new Promise((resolve) => setTimeout(resolve, 160));
    const response = await route.fetch();
    if (dropFirstResponse) {
      dropFirstResponse = false;
      retries++;
      // Server committed the bytes but the success response was lost at the proxy.
      await route.fulfill({
        status: 502,
        contentType: "text/plain",
        body: "Proxy connection interrupted",
      });
    } else await route.fulfill({ response });
  });
  await page.goto("/api/hassio_ingress/test-token/");
  await page.getByRole("button", { name: "Übungsbibliothek" }).click();
  await page.getByRole("button", { name: "Übung hinzufügen" }).click();
  const name = `Großes MOV ${testInfo.project.name}`;
  await page.getByLabel("Übungsname").fill(name);
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "iphone.MOV", mimeType: "", buffer: payload });
  const started = Date.now();
  await page.getByRole("button", { name: "Übung speichern" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 50_000 });
  if (testInfo.project.name === "desktop")
    expect(Date.now() - started).toBeGreaterThan(9000);
  expect(largestRequest).toBeLessThanOrEqual(256 * 1024);
  expect(retries).toBe(1);
  await page
    .getByRole("button", { name: `${name} ansehen`, exact: true })
    .click();
  const source = await page.locator("video").getAttribute("src");
  const downloaded = await page.request.get(source!);
  expect(downloaded.headers()["content-type"]).toBe("video/quicktime");
  expect(Buffer.compare(await downloaded.body(), payload)).toBe(0);
});

test("manual retry resumes confirmed chunks without duplicating the exercise", async ({
  page,
}, testInfo) => {
  const payload = Buffer.concat([
    readFileSync("../../tests/fixtures/hevc-main10-12s.mov"),
    Buffer.alloc(800_000),
  ]);
  let failures = 3;
  const offsets: number[] = [];
  await page.route("**/api/video-uploads/*", async (route) => {
    if (
      route.request().method() !== "POST" ||
      new URL(route.request().url()).pathname.endsWith("/finish")
    ) {
      await route.continue();
      return;
    }
    const offset = Number(
      new URL(route.request().url()).searchParams.get("offset"),
    );
    offsets.push(offset);
    const response = await route.fetch();
    if (offset === 256 * 1024 && failures > 0) {
      failures--;
      await route.fulfill({ status: 502, body: "Lost acknowledgement" });
    } else await route.fulfill({ response });
  });
  await page.goto("/api/hassio_ingress/test-token/");
  await page.getByRole("button", { name: "Übungsbibliothek" }).click();
  await page.getByRole("button", { name: "Übung hinzufügen" }).click();
  const name = `Upload fortsetzen ${testInfo.project.name}`;
  await page.getByLabel("Übungsname").fill(name);
  await page.locator("input[type=file]").setInputFiles({
    name: "resume.MOV",
    mimeType: "video/quicktime",
    buffer: payload,
  });
  await page.getByRole("button", { name: "Übung speichern" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Bereits bestätigte Teile bleiben erhalten",
  );
  expect(offsets).toEqual([0, 262144, 262144, 262144]);
  await page.getByRole("button", { name: "Übung speichern" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(offsets[4]).toBe(524288);
  const card = page.locator(".exercise-card").filter({ hasText: name });
  await expect(card).toHaveCount(1);
  await page
    .getByRole("button", { name: `${name} ansehen`, exact: true })
    .click();
  const result = await page.request.get(
    (await page.locator("video").getAttribute("src"))!,
  );
  expect(Buffer.compare(await result.body(), payload)).toBe(0);
});

test("disk-backed 38.5 MB HEVC MOV is read into memory before every network request", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  // Reproduce the affected WebKit contract: serializing a file-backed Blob fails,
  // whereas explicitly read ArrayBuffer bodies remain usable by the network process.
  await page.addInitScript(() => {
    const send = XMLHttpRequest.prototype.send;
    const read = FileReader.prototype.readAsArrayBuffer;
    (window as any).memoryUploadCounts = { reads: 0, sends: 0 };
    FileReader.prototype.readAsArrayBuffer = function (blob) {
      (window as any).memoryUploadCounts.reads++;
      return read.call(this, blob);
    };
    XMLHttpRequest.prototype.send = function (body) {
      if (body instanceof Blob)
        throw new DOMException(
          "File sandbox access denied",
          "NotReadableError",
        );
      if (body instanceof ArrayBuffer)
        (window as any).memoryUploadCounts.sends++;
      return send.call(this, body);
    };
  });
  const source = readFileSync("../../tests/fixtures/hevc-main10-12s.mov");
  const size = 38_500_000;
  const free = Buffer.alloc(8);
  free.writeUInt32BE(size - source.length, 0);
  free.write("free", 4);
  const payload = Buffer.concat([
    source,
    free,
    Buffer.alloc(size - source.length - free.length),
  ]);
  mkdirSync(testInfo.outputDir, { recursive: true });
  const file = testInfo.outputPath("iphone-385mb.mov");
  writeFileSync(file, payload);
  await page.goto("/api/hassio_ingress/test-token/");
  await page.getByRole("button", { name: "Übungsbibliothek" }).click();
  await page.getByRole("button", { name: "Übung hinzufügen" }).click();
  const name = `Datei vom Gerät ${testInfo.project.name}`;
  await page.getByLabel("Übungsname").fill(name);
  // A real filesystem path, not Playwright's in-memory file-buffer shortcut.
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByRole("button", { name: "Übung speichern" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 75_000 });
  const counts = await page.evaluate(() => (window as any).memoryUploadCounts);
  expect(counts.reads).toBe(Math.ceil(size / 262144));
  expect(counts.sends).toBe(counts.reads);
  await page
    .getByRole("button", { name: `${name} ansehen`, exact: true })
    .click();
  const response = await page.request.get(
    (await page.locator("video").getAttribute("src"))!,
  );
  expect(response.headers()["content-type"]).toBe("video/quicktime");
  expect(Buffer.compare(await response.body(), payload)).toBe(0);
});

test("unreadable local video reports a file error before sending any video bytes", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    FileReader.prototype.readAsArrayBuffer = function () {
      throw new DOMException("File not locally available", "NotReadableError");
    };
  });
  let blocksSent = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /\/api\/video-uploads\/[^/]+\?/.test(request.url())
    )
      blocksSent++;
  });
  await page.goto("/api/hassio_ingress/test-token/");
  await page.getByRole("button", { name: "Übungsbibliothek" }).click();
  await page.getByRole("button", { name: "Übung hinzufügen" }).click();
  await page
    .getByLabel("Übungsname")
    .fill(`Dateifehler ${testInfo.project.name}`);
  await page
    .locator("input[type=file]")
    .setInputFiles("../../tests/fixtures/hevc-main10-12s.mov");
  await page.getByRole("button", { name: "Übung speichern" }).click();
  await expect(page.getByRole("alert")).toContainText("DATEI_LESEN");
  await expect(page.getByRole("alert")).toContainText("Dateien-App");
  expect(blocksSent).toBe(0);
});

for (const sent of [false, true]) {
  test(`timeout diagnostic distinguishes sent=${sent} at zero confirmed bytes`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((sent) => {
      XMLHttpRequest.prototype.send = function () {
        // Controlled timeout, without waiting 45 seconds for each of three attempts.
        if (sent) this.upload.dispatchEvent(new ProgressEvent("load"));
        this.dispatchEvent(new ProgressEvent("timeout"));
      };
    }, sent);
    await page.goto("/api/hassio_ingress/test-token/");
    await page.getByRole("button", { name: "Übungsbibliothek" }).click();
    await page.getByRole("button", { name: "Übung hinzufügen" }).click();
    await page
      .getByLabel("Übungsname")
      .fill(`Zeitlimit ${sent} ${testInfo.project.name}`);
    await page
      .locator("input[type=file]")
      .setInputFiles("../../tests/fixtures/hevc-main10-12s.mov");
    await page.getByRole("button", { name: "Übung speichern" }).click();
    await expect(page.getByRole("alert")).toContainText(
      sent ? "UPLOAD_BESTAETIGUNG" : "UPLOAD_SENDEN",
    );
    await expect(page.getByRole("alert")).toContainText("0.00 von");
    await expect(page.getByRole("alert")).not.toContainText("DATEI_LESEN");
  });
}
