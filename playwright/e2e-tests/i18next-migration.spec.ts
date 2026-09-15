import { readFileSync } from "node:fs"
import path from "node:path"
import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

const contactName = "Migration QA Contact"
const phishingUrl = "https://migration-check.example.invalid"
const phishingKey = "<0>{{displayUrl}}</0> has been reported as a <3>malicious site</3>"
const deleteKey = "You are deleting contact '<1>{{contactName}}</1>' from your address book."
const networkResetKey =
  "This will reset <1>{{name}}</1> to its Talisman default state. Are you sure you want to continue ?"
const tokenResetKey =
  "This will reset <1>{{symbol}}</1> to its Talisman default state. Are you sure you want to continue ?"

const loadCatalog = (language: string) => {
  const catalog: Record<string, string> = JSON.parse(
    readFileSync(path.resolve("apps/extension/public/locales", language, "common.json"), "utf8")
  )
  return (key: string) => {
    const value = catalog[key]
    if (!value) throw new Error(`Missing ${language} translation for key: ${key}`)
    return value
  }
}

const expectNoRawPlaceholders = async (page: Page) => {
  await expect(page.locator("body")).not.toContainText("{{")
}

for (const [language, label] of [
  ["en", "English"],
  ["fr", "Français"],
]) {
  test(`translated warnings and confirmations (${language})`, async ({
    onboardedPage: page,
    extensionId,
  }) => {
    const text = loadCatalog(language)
    const plain = (key: string, values: Record<string, string>) =>
      Object.entries(values).reduce(
        (value, [name, replacement]) => value.replaceAll(`{{${name}}}`, replacement),
        text(key).replace(/<[^>]+>/g, "")
      )
    const dashboard = `chrome-extension://${extensionId}/dashboard.html#`

    await page.goto(`${dashboard}/settings/general/language`)
    await page.getByRole("button", { name: label, exact: true }).click()
    await expect(page.locator("html")).toHaveAttribute("lang", language)

    await page.goto(`${dashboard}/phishing-page-detected/${encodeURIComponent(phishingUrl)}`)
    await expect(
      page.getByText(plain(phishingKey, { displayUrl: phishingUrl }), { exact: true })
    ).toBeVisible()
    await expect(page.getByText(phishingUrl, { exact: true })).toBeVisible()
    await expectNoRawPlaceholders(page)

    await page.goto(`${dashboard}/settings/address-book`)
    await page.getByRole("button", { name: text("Add a contact"), exact: true }).click()
    await page.getByPlaceholder(text("Contact name"), { exact: true }).fill(contactName)
    await page
      .getByPlaceholder(text("Address"), { exact: true })
      .fill("0x0000000000000000000000000000000000000001")
    await page.getByRole("button", { name: text("Save"), exact: true }).click()
    await expect(page.getByText(contactName, { exact: true })).toBeVisible()
    await page.getByTestId("contact-menu-button").click()
    await page.getByRole("button", { name: text("Delete contact"), exact: true }).click()
    await expect(page.getByText(plain(deleteKey, { contactName }), { exact: true })).toBeVisible()
    await expect(page.getByText(contactName, { exact: true }).last()).toBeVisible()
    await expectNoRawPlaceholders(page)
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click()

    const networkName = "Migration QA Network"
    const networkRoute = `${dashboard}/settings/networks-tokens/network/1`
    await page.goto(networkRoute)
    await page.locator('input[name="name"]').fill(networkName)
    await page.getByRole("button", { name: text("Save"), exact: true }).click()
    await expect(page).not.toHaveURL(networkRoute)
    await page.goto(networkRoute)
    await page.getByRole("button", { name: text("Reset"), exact: true }).click()
    await expect(
      page.getByText(plain(networkResetKey, { name: networkName }), { exact: true })
    ).toBeVisible()
    await expectNoRawPlaceholders(page)
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click()

    const symbol = "QAETH"
    const tokenRoute = `${dashboard}/settings/networks-tokens/tokens/1:evm-native`
    await page.goto(tokenRoute)
    await page.locator('input[name="symbol"]').fill(symbol)
    await page.getByRole("button", { name: text("Save"), exact: true }).click()
    await expect(page).not.toHaveURL(tokenRoute)
    await page.goto(tokenRoute)
    await expect(page.locator('input[name="symbol"]')).toHaveValue(symbol)
    await page.getByRole("button", { name: text("Reset"), exact: true }).click()
    await expect(page.getByText(plain(tokenResetKey, { symbol }), { exact: true })).toBeVisible()
    await expectNoRawPlaceholders(page)
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click()
  })
}
