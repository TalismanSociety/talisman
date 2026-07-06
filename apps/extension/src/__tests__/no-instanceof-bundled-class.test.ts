import { type Dirent, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Guard against the bug class that broke every Solana transfer (see
 * packages/chain-connectors/src/sol/ChainConnectorSolStub.ts).
 *
 * Classes from these packages get bundled into MULTIPLE chunks/contexts — the popup, the
 * dashboard, the background service worker, and the injected page.js dapp provider are all
 * separate self-contained bundles by necessity (content/inject scripts use
 * `inlineDynamicImports` and cannot share chunks; page.js carries its own full @solana copy).
 * There is therefore no single shared class instance. `instanceof` on such a class returns
 * `false` whenever the value originates from a different bundled copy than the class
 * reference — which is exactly how `ChainConnectorSolStub` silently fell through to
 * `getSolConnection(undefined)` and threw "Cannot read properties of undefined (reading '0')".
 *
 * Use a name/`in`/duck-typed check instead (e.g. `"rpcs" in x`, `err.name === "..."`).
 *
 * Only *value* imports are flagged — `import type { ... }` cannot be used with `instanceof`.
 */
const BANNED_PACKAGES = ["@solana/kit", "viem", "@blockaid/client"]

const REPO_ROOT = resolve(import.meta.dirname, "../../../..")

const SCAN_DIRS = [
  join(REPO_ROOT, "apps/extension/src"),
  join(REPO_ROOT, "packages/solana/src"),
  join(REPO_ROOT, "packages/balances/src"),
  join(REPO_ROOT, "packages/chain-connectors/src"),
]

const listSourceFiles = (dir: string): string[] => {
  const out: string[] = []
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out // directory may be absent in a partial checkout
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".turbo")
        continue
      out.push(...listSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

// Names value-imported from `pkg` (skips `import type {...}` and inline `type X` specifiers,
// since a type-only binding cannot appear in an `instanceof` expression).
const valueImportsFrom = (code: string, pkg: string): string[] => {
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`import\\s+(type\\s+)?\\{([^}]*)\\}\\s+from\\s+["']${escaped}["']`, "g")
  const names: string[] = []
  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m[1]) continue // `import type { ... }` — type-only, cannot be instanceof'd
    for (const specifier of m[2].split(",")) {
      const cleaned = specifier.trim()
      if (!cleaned || cleaned.startsWith("type ")) continue
      const local = cleaned
        .split(/\s+as\s+/)
        .pop()
        ?.trim()
      if (local) names.push(local)
    }
  }
  return names
}

describe("no instanceof on bundled (multi-copy) classes", () => {
  it("never uses `instanceof` on a class value-imported from a bundle-duplicated package", () => {
    const violations: string[] = []

    for (const dir of SCAN_DIRS) {
      for (const file of listSourceFiles(dir)) {
        const code = readFileSync(file, "utf8")
        for (const pkg of BANNED_PACKAGES) {
          for (const name of valueImportsFrom(code, pkg)) {
            if (new RegExp(`instanceof\\s+${name}\\b`).test(code)) {
              violations.push(
                `${file.replace(`${REPO_ROOT}/`, "")}: \`instanceof ${name}\` — ${name} is imported from ${pkg}`
              )
            }
          }
        }
      }
    }

    expect(
      violations,
      `\`instanceof\` on a class from a bundle-duplicated package is unsafe (the value may come ` +
        `from a different bundled copy than the class). Use a name/\`in\`/duck-typed check instead:\n` +
        violations.join("\n")
    ).toEqual([])
  })
})
