import { readFileSync } from "node:fs"
import { relative, resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { lineAt, listSourceFiles } from "./listSourceFiles"

/**
 * The English text passed to `t()` is the translation key, and the extractor only reads static
 * strings. A key built from a template literal with `${...}` is never extracted, so it is never
 * translated.
 *
 * Use i18next interpolation instead: `t("Stake {{symbol}} now", { symbol })`.
 */
const SRC_DIR = resolve(import.meta.dirname, "..")

const DYNAMIC_KEY = /\bt\(\s*`[^`]*\$\{/g

const findDynamicKeys = (code: string) =>
  [...code.matchAll(DYNAMIC_KEY)].map((match) => lineAt(code, match.index))

describe("translation keys", () => {
  it("flags a template literal key", () => {
    expect(findDynamicKeys(`const a = t(\`Stake $\{symbol} now\`)`)).toEqual([1])
    expect(findDynamicKeys(`const a = i18next.t(\n  \`Stake $\{symbol}\`\n)`)).toEqual([1])
    expect(findDynamicKeys('const a = t("Stake {{symbol}} now", { symbol })')).toEqual([])
    expect(findDynamicKeys("const a = t(`Copy failed`)")).toEqual([])
    expect(findDynamicKeys(`genericEvent(\`$\{type} Bond\`)`)).toEqual([])
  })

  it("are static strings", () => {
    const offenders = listSourceFiles(SRC_DIR).flatMap((file) =>
      findDynamicKeys(readFileSync(file, "utf8")).map(
        (line) => `${relative(SRC_DIR, file)}:${line}`
      )
    )

    expect(offenders).toEqual([])
  })
})
