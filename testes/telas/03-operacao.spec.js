import { test, expect } from "@playwright/test";
import { entrar, toast, vigiarErros } from "./_util.js";

test("técnico registra uma medição pela tela", async ({ page }) => {
  const erros = vigiarErros(page);
  await entrar(page, "tecnico");
  await page.goto("/medicoes");
  await page.waitForLoadState("networkidle");
  await page.selectOption("#m-m", "CP-01");
  await page.selectOption("#m-g", "temperatura");
  await page.fill("#m-v", "60");
  await page.getByRole("button", { name: "Salvar medição" }).click();
  expect(await toast(page)).toMatch(/medição|registrad|salv/i);
  expect(erros).toEqual([]);
});

test("técnico move uma OS de status", async ({ page }) => {
  await entrar(page, "tecnico");
  await page.goto("/ordens");
  await page.waitForLoadState("networkidle");
  await page.locator("article").first().click();
  await page.selectOption("#o-s", "andamento");
  await page.getByRole("button", { name: "Atualizar status" }).click();
  expect(await toast(page)).toMatch(/andamento/i);
});

test("funcionário abre um chamado e acompanha", async ({ page }) => {
  const erros = vigiarErros(page);
  await entrar(page, "funcionario");
  await page.selectOption("#c-m", "PH-03");
  await page.getByText("Vazamento", { exact: true }).click();
  await page.getByText("Alta", { exact: true }).click();
  await page.fill("#c-d", "Óleo pingando embaixo da prensa (teste automatizado).");
  await page.getByRole("button", { name: "Enviar chamado" }).click();
  const msg = page.getByText(/Chamado CH-\d+ enviado/);
  await expect(msg).toBeVisible();
  const protocolo = (await msg.innerText()).match(/CH-\d+/)[0];
  await page.getByRole("link", { name: "Acompanhar chamado" }).click();
  await page.waitForURL("**/meus-chamados");
  // o chamado novo aparece no histórico e na linha do tempo, como "Registrado"
  await expect(page.locator("tr", { hasText: protocolo })).toContainText("Vazamento");
  await expect(page.getByText(`${protocolo} · PH-03`)).toBeVisible();
  expect(erros).toEqual([]);
});
