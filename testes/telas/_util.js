/* Apoio dos testes de tela */
import { expect } from "@playwright/test";
import { LOGINS, SENHA } from "../config.js";

export const DESTINO = { gestor: "/dashboard", tecnico: "/dashboard", funcionario: "/chamado" };

// Entra no sistema pela tela de login, como uma pessoa faria
export async function entrar(page, perfil, usuario = LOGINS[perfil], senha = SENHA) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.locator(`label[for=p-${perfil}]`).click();
  await page.fill("#usuario", usuario);
  await page.fill("#senha", senha);
  await page.locator("form button.btn-primary").click();
  await page.waitForURL("**" + DESTINO[perfil]);
  await page.waitForLoadState("networkidle");
}

// Guarda erros de JavaScript e respostas 500 da página
export function vigiarErros(page) {
  const erros = [];
  page.on("pageerror", (e) => erros.push("JS: " + e.message));
  page.on("response", (r) => { if (r.status() >= 500) erros.push(`${r.status()} ${r.url()}`); });
  return erros;
}

export async function toast(page) {
  const t = page.locator(".toast-container .toast").last();
  await expect(t).toBeVisible();
  return (await t.innerText()).trim();
}

// Nenhuma rolagem para o lado (layout quebrado)
export async function semRolagemLateral(page) {
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra, "a página está mais larga que a tela").toBeLessThanOrEqual(1);
}
