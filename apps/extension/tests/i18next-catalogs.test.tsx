import { readFileSync } from "node:fs"
import path from "node:path"
import { SignViewStakingSetAutoCompound } from "@ui/domains/Sign/Views/staking/SignViewStakingSetAutoCompound"
import { SignViewStakingStake } from "@ui/domains/Sign/Views/staking/SignViewStakingStake"
import { createInstance } from "i18next"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it, vi } from "vitest"

import languages from "../public/locales/languages.json"
import {
  defaultNamespace,
  keySeparator,
  namespaceSeparator,
  pluralSeparator,
} from "../src/common/i18nSharedConfig"
import migrationKeys from "./fixtures/i18next-migration-keys.json"

vi.unmock("react-i18next")
vi.mock("@ui/state/chaindata", () => ({ useToken: () => ({ symbol: "TAO" }) }))
vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))
vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({ TokensAndFiat: () => <span>1 TAO</span> }))

const catalog = (language: string): Record<string, string> =>
  JSON.parse(
    readFileSync(path.resolve(__dirname, "../public/locales", language, "common.json"), "utf8")
  )
const english = catalog("en")
const placeholders = (value: string) =>
  [...value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((match) => match[1]).sort()
// Translated text may wrap naturally instead of retaining an explicit <br/>.
// Component markers must still be preserved: they carry names, links, and emphasis.
const componentMarkers = (value: string) =>
  (value.match(/<\/?[\w]+\s*\/?>/g) ?? []).filter((tag) => !/^<br\s*\/?>$/.test(tag)).sort()

describe.each(Object.keys(languages))("bundled translations (%s)", (language) => {
  it("contains every migrated key with intact interpolation and component markers", () => {
    const translations = catalog(language)
    for (const key of migrationKeys) {
      expect(translations[key], key).toBeTruthy()
      expect(placeholders(translations[key]), key).toEqual(placeholders(english[key]))
      expect(componentMarkers(translations[key]), key).toEqual(componentMarkers(english[key]))
    }
  })

  it("renders the actual staking summaries with translated text, token symbol, and percentages", async () => {
    const missingKeyHandler = vi.fn()
    const i18n = createInstance()
    await i18n.init({
      lng: language,
      fallbackLng: false,
      defaultNS: defaultNamespace,
      nsSeparator: namespaceSeparator,
      keySeparator,
      pluralSeparator,
      resources: { [language]: { common: catalog(language) } },
      interpolation: { escapeValue: false },
      saveMissing: true,
      missingKeyHandler,
    })
    for (const autoCompound of [0, 42]) {
      const html = renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
          <SignViewStakingSetAutoCompound tokenId="migration-test" autoCompound={autoCompound} />
          <SignViewStakingStake tokenId="migration-test" planck={1n} autoCompound={autoCompound} />
        </I18nextProvider>
      )
      expect(html).toContain("TAO")
      expect(html).toContain(String(autoCompound))
      expect(html).not.toContain("{{")
      expect(html).not.toContain("_pluralSeparator_")
    }
    expect(missingKeyHandler).not.toHaveBeenCalled()
  })
})
