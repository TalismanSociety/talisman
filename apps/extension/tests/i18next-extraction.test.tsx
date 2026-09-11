import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createInstance } from "i18next"
import { runExtractor } from "i18next-cli"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nextProvider } from "react-i18next"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import config from "../i18next.config"
import {
  defaultNamespace,
  keySeparator,
  namespaceSeparator,
  pluralSeparator,
} from "../src/common/i18nSharedConfig"
import { TranslationExamples } from "./fixtures/i18next"

// Exercise the real Trans serializer, not the extension's global translation mock.
vi.unmock("react-i18next")

describe("translation extraction", () => {
  let directory: string
  let translations: Record<string, string>

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "talisman-i18next-"))
    const result = await runExtractor(
      {
        ...config,
        extract: {
          ...config.extract,
          input: [path.resolve(__dirname, "fixtures/i18next.tsx")],
          output: path.join(directory, "{{language}}", "{{namespace}}.json"),
        },
      },
      { quiet: true }
    )
    expect(result.hasErrors).toBe(false)
    expect(result.results.map(({ namespace }) => namespace)).toEqual(["common"])
    translations = JSON.parse(await readFile(path.join(directory, "en/common.json"), "utf8"))
  })

  afterAll(async () => {
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it("preserves natural-language defaults, explicit keys, and the runtime plural suffix", () => {
    expect(translations).toMatchObject({
      "Protocol: <Protocol />": "Protocol: <Protocol />",
      "Receiving from an exchange?": "Receiving from an exchange?",
      "Explicit key": "Explicit default",
      "Status: Loading...": "Status: Loading...",
      "{{count}} minutes_pluralSeparator_one": "{{count}} minutes",
      "{{count}} minutes_pluralSeparator_other": "{{count}} minutes",
    })
    expect(translations).not.toHaveProperty("{{count}} minutes_one")
  })

  it.each(["en", "fr"])(
    "extracts the exact keys requested by react-i18next in %s",
    async (language) => {
      const missingKeyHandler = vi.fn()
      const i18n = createInstance()
      await i18n.init({
        lng: language,
        fallbackLng: false,
        defaultNS: defaultNamespace,
        nsSeparator: namespaceSeparator,
        keySeparator,
        pluralSeparator,
        resources: {
          en: { common: translations },
          // A synthetic translated catalog verifies lookup and interpolation in a
          // secondary language without contacting SimpleLocalize.
          fr: {
            common: {
              ...translations,
              "Delete <1>{{name}}</1>?": "Supprimer <1>{{name}}</1> ?",
              "{{count}} minutes_pluralSeparator_other": "{{count}} minutes traduites",
            },
          },
        },
        interpolation: { escapeValue: false },
        saveMissing: true,
        missingKeyHandler,
      })
      const html = renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
          <TranslationExamples t={i18n.t} />
        </I18nextProvider>
      )
      expect(missingKeyHandler).not.toHaveBeenCalled()
      expect(html).toContain("Protocol: <strong>Ethereum</strong>")
      expect(html).toContain(
        language === "fr" ? "Supprimer <span>Alice</span> ?" : "Delete <span>Alice</span>?"
      )
      expect(html).toContain("Please<br/><strong>confirm</strong> now.")
      expect(html).toContain(language === "fr" ? "2 minutes traduites" : "2 minutes")
      expect(html).not.toContain("{{")
    }
  )
})
