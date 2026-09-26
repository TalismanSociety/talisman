import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { REPO_ROOT } from "./listSourceFiles"

/**
 * An override value with only a lower bound (`">=7.26.10"`) also accepts the next major. pnpm
 * then hands that major to packages that declared the old one: `@babel/runtime` 8 broke
 * `@metamask/ethjs-contract`, `js-yaml` 5 broke `i18next-parser`.
 *
 * Cap each range override below the next major: `">=7.26.10 <8.0.0"` (`<0.8.0` for `0.7.x`).
 */
const ALLOWED: Record<string, string> = {
  "bn.js@<4.12.3": "see the comment in pnpm-workspace.yaml",
}

const OVERRIDE_ENTRY = /^\s+(?:"([^"]+)"|'([^']+)'|([^\s:#]+)):\s*["']?([^"'#\n]*)["']?/

const readOverrides = (yaml: string) => {
  const lines = yaml.split(/\r?\n/)
  const start = lines.indexOf("overrides:") + 1
  const end = lines.findIndex((line, i) => i >= start && /^[^\s#]/.test(line))
  const block = start > 0 ? lines.slice(start, end === -1 ? undefined : end) : []
  return block.flatMap((line) => {
    const match = line.match(OVERRIDE_ENTRY)
    if (!match) return []
    const [, doubleQuoted, singleQuoted, bare, value] = match
    return [{ key: doubleQuoted ?? singleQuoted ?? bare, value: value.trim() }]
  })
}

const isUncapped = (value: string) => />/.test(value) && !/</.test(value)

describe("pnpm overrides", () => {
  it("reads quoted and bare keys and flags a missing upper bound", () => {
    const yaml = [
      "overrides:",
      "  # comment",
      '  "semver": "7.8.5"',
      "# column-0 comment",
      '  "vite@<5.4.20": ">=5.4.20 <6.0.0"',
      "  lodash: '>=4.18.1'",
      "other: 1",
    ].join("\n")
    const overrides = readOverrides(yaml)

    expect(overrides).toEqual([
      { key: "semver", value: "7.8.5" },
      { key: "vite@<5.4.20", value: ">=5.4.20 <6.0.0" },
      { key: "lodash", value: ">=4.18.1" },
    ])
    expect(overrides.filter(({ value }) => isUncapped(value)).map(({ key }) => key)).toEqual([
      "lodash",
    ])
  })

  it("cap version ranges below the next major", () => {
    const overrides = readOverrides(readFileSync(join(REPO_ROOT, "pnpm-workspace.yaml"), "utf8"))
    const uncapped = overrides
      .filter(({ key, value }) => isUncapped(value) && !(key in ALLOWED))
      .map(({ key, value }) => `${key}: ${value}`)

    expect(overrides.length).toBeGreaterThan(0)
    expect(uncapped).toEqual([])
  })

  it("allow only overrides that are still uncapped", () => {
    const overrides = readOverrides(readFileSync(join(REPO_ROOT, "pnpm-workspace.yaml"), "utf8"))
    const stale = Object.keys(ALLOWED).filter(
      (key) => !overrides.some((override) => override.key === key && isUncapped(override.value))
    )

    expect(stale).toEqual([])
  })
})
