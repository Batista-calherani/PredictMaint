import { test, expect } from "@playwright/test";
import { entrar, vigiarErros } from "./_util.js";
import { API_URL, RODADA } from "../config.js";

// Máquina recém-cadastrada não tem medições: o dashboard precisa continuar de pé
test("dashboard com máquina sem medições não quebra", async ({ page }) => {
  const erros = vigiarErros(page);
  const cod = `TST-V${RODADA}`;
  await entrar(page, "gestor");
  const token = await page.evaluate(() => localStorage.getItem("pm_token"));
  const h = { Authorization: "Bearer " + token };
  expect((await page.request.post(API_URL + "/maquinas", { headers: h, data: { id: cod, nome: "Sem leituras", setor: "Usinagem" } })).status()).toBe(201);
  await page.request.put(API_URL + `/maquinas/${cod}`, { headers: h, data: { saude: 5 } });
  try {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".pm-kpi").first()).toBeVisible();
    await expect(page.getByText(/^Vibração · /)).toBeVisible();
    // abre o gráfico ampliado e escolhe a máquina sem medições
    await page.locator('section[aria-label="Ampliar: vibração"]').click();
    await page.selectOption("#ex-m", cod);
    await expect(page.locator(".modal")).toContainText(`Ainda não há medições de vibração para ${cod}`);
    await page.selectOption("#ex-g", "temperatura");
    await expect(page.locator(".modal")).toContainText("Ainda não há medições de temperatura");
    await expect(page.locator(".modal").getByRole("link", { name: "Registrar medição" })).toBeVisible();
    // volta para uma máquina com leituras: o gráfico aparece de novo
    await page.selectOption("#ex-m", "PH-03");
    await expect(page.locator(".modal .pm-chart svg")).toBeVisible();
    expect(erros).toEqual([]);
  } finally {
    await page.request.delete(API_URL + `/maquinas/${cod}`, { headers: h });
  }
});
