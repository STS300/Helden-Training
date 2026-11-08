import { test, expect } from "@playwright/test";

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

test("MP4 upload and relative video URL", async ({ page }, testInfo) => {
  await page.goto("/api/hassio_ingress/test-token/");
  await page.getByRole("button", { name: "Übungsbibliothek" }).click();
  await page.getByRole("button", { name: "Übung hinzufügen" }).click();
  await page.getByLabel("Übungsname").fill(`Video ${testInfo.project.name}`);
  await page.locator("input[type=file]").setInputFiles({
    name: "test.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from(
      "000000186674797069736f6d0000000069736f6d6d703432",
      "hex",
    ),
  });
  await page.getByRole("button", { name: "Übung speichern" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: `Video ${testInfo.project.name} ansehen`,
      exact: true,
    })
    .click();
  const source = await page.locator("video").getAttribute("src");
  expect(source).toContain("/api/hassio_ingress/test-token/api/exercises/");
  const result = await page.request.get(source!);
  expect(result.status()).toBe(200);
  // Container fixture only. Playback codec validation is a separate manual check.
});
