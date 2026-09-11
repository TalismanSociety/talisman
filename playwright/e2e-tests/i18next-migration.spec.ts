import { readFileSync } from "node:fs"
import path from "node:path"

import { expect, test } from "./fixtures"

const contactName = "Migration QA Contact"
const phishingUrl = "https://migration-check.example.invalid"
const phishingKey = "<0>{{displayUrl}}</0> has been reported as a <3>malicious site</3>"
const deleteKey = "You are deleting contact '<1>{{contactName}}</1>' from your address book."

for (const [language, label] of [
  ["en", "English"],
  ["fr", "Français"],
]) {
  test(`translated warnings and confirmations (${language})`, async ({
    onboardedPage: page,
    extensionId,
  }, testInfo) => {
    const catalog: Record<string, string> = JSON.parse(
      readFileSync(path.resolve("apps/extension/public/locales", language, "common.json"), "utf8")
    )
    const text = (key: string) => catalog[key] || key
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
    await page.screenshot({ path: testInfo.outputPath(`phishing-${language}.png`) })

    await page.goto(`${dashboard}/settings/address-book`)
    await page.getByRole("button", { name: text("Add a contact"), exact: true }).click()
    await page.getByPlaceholder(text("Contact name"), { exact: true }).fill(contactName)
    await page
      .getByPlaceholder(text("Address"), { exact: true })
      .fill("0x0000000000000000000000000000000000000001")
    await page.getByRole("button", { name: text("Save"), exact: true }).click()
    const contact = page.getByText(contactName, { exact: true })
    await expect(contact).toBeVisible()
    await contact.locator("../..").getByRole("button").last().click()
    await page.getByRole("button", { name: text("Delete contact"), exact: true }).click()
    await expect(page.getByText(plain(deleteKey, { contactName }), { exact: true })).toBeVisible()
    await expect(page.getByText(contactName, { exact: true }).last()).toBeVisible()
    await expect(page.locator("body")).not.toContainText("{{")
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click({ trial: true })
    await page.screenshot({
      path: testInfo.outputPath(`contact-${language}.png`),
      animations: "disabled",
    })
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click()

    const networkName = "Migration QA Network"
    const networkRoute = `${dashboard}/settings/networks-tokens/network/1`
    await page.goto(networkRoute)
    await page.getByRole("textbox").first().fill(networkName)
    await page.getByRole("button", { name: text("Save"), exact: true }).click()
    await expect(page).not.toHaveURL(networkRoute)
    await page.goto(networkRoute)
    await page.getByRole("button", { name: text("Reset"), exact: true }).click()
    await expect(
      page.getByText(
        plain(
          "This will reset <1>{{name}}</1> to its Talisman default state. Are you sure you want to continue ?",
          { name: networkName }
        ),
        { exact: true }
      )
    ).toBeVisible()
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click({ trial: true })
    await page.screenshot({
      path: testInfo.outputPath(`network-reset-${language}.png`),
      animations: "disabled",
    })
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click()

    const requestedSymbol = "QAETH"
    const tokenRoute = `${dashboard}/settings/networks-tokens/tokens/1:evm-native`
    await page.goto(tokenRoute)
    await page
      .getByText(text("Symbol"), { exact: true })
      .locator("..")
      .getByRole("textbox")
      .fill(requestedSymbol)
    await page.getByRole("button", { name: text("Save"), exact: true }).click()
    await expect(page).not.toHaveURL(tokenRoute)
    await page.goto(tokenRoute)
    await expect(page.locator('input[name="symbol"]')).toHaveValue(requestedSymbol)
    const symbol = requestedSymbol
    await page.getByRole("button", { name: text("Reset"), exact: true }).click()
    await expect(
      page.getByText(
        plain(
          "This will reset <1>{{symbol}}</1> to its Talisman default state. Are you sure you want to continue ?",
          { symbol }
        ),
        { exact: true }
      )
    ).toBeVisible()
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click({ trial: true })
    await page.screenshot({
      path: testInfo.outputPath(`token-reset-${language}.png`),
      animations: "disabled",
    })
    await page.getByRole("button", { name: text("Cancel"), exact: true }).click()
  })
}
