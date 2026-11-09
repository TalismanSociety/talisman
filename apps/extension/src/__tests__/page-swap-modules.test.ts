import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * The swap modules in `ui/domains/Swap/swap-modules/` are copied into the mobile wallet, so they
 * read the wallet only through `SwapEnv` and the per-repo adapter files next to them, which the
 * walk does not enter. `core/domains/swaps/status.ts`, which the background polls swap status
 * with, follows the same rule.
 */
const EXTENSION = join(REPO_ROOT, "apps/extension")
const SRC = join(EXTENSION, "src")
const UI = join(SRC, "ui")
const SWAP_MODULES = join(SRC, "ui/domains/Swap/swap-modules")

const RUNTIME_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm
const DYNAMIC_IMPORT = /\bimport\s*\(/
const ALIAS = /^@(core|ui|common)(\/.*)?$/

const resolveImport = (from: string, specifier: string): string | undefined => {
  const alias = ALIAS.exec(specifier)
  const base = specifier.startsWith(".")
    ? join(dirname(from), specifier)
    : alias && join(SRC, alias[1], alias[2] ?? "")
  if (!base) return undefined
  return ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]
    .map((suffix) => base + suffix)
    .find((file) => existsSync(file) && statSync(file).isFile())
}

type ImportRules = {
  isForbidden: (file: string) => boolean
  isBoundary: (file: string) => boolean
}

const forbiddenChain =
  ({ isForbidden, isBoundary }: ImportRules) =>
  (entry: string): string[] | null => {
    const parent = new Map<string, string | null>([[entry, null]])
    const queue = [entry]
    while (queue.length) {
      const file = queue.shift() as string
      for (const [, specifier] of readFileSync(file, "utf8").matchAll(RUNTIME_IMPORT)) {
        const next = resolveImport(file, specifier)
        if (!next || parent.has(next)) continue
        parent.set(next, file)
        if (isForbidden(next)) {
          const chain: string[] = []
          for (let at: string | null | undefined = next; at; at = parent.get(at))
            chain.unshift(relative(EXTENSION, at))
          return chain
        }
        if (!isBoundary(next)) queue.push(next)
      }
    }
    return null
  }

const PAGE_ADAPTERS = new Set([
  join(SWAP_MODULES, "evm-network.ts"),
  join(SWAP_MODULES, "lifi-api.ts"),
  join(SWAP_MODULES, "stealthex-api.ts"),
  join(SWAP_MODULES, "simpleswap-api.ts"),
  join(SWAP_MODULES, "substrate-deposit.ts"),
])

const PAGE_SWAP_MODULES = [
  ...listSourceFiles(SWAP_MODULES).filter((file) => !PAGE_ADAPTERS.has(file)),
  join(SRC, "core/domains/swaps/status.ts"),
]

const PAGE_REALM = [
  join(UI, "state/"),
  join(UI, "api/"),
  join(UI, "util/gandalfFetch.ts"),
  join(SRC, "ui/domains/Swap/hooks/"),
  join(SRC, "ui/domains/Swap/swapEnv.ui.ts"),
]
const STORE = /\/core\/domains\/[^/]+\/store\.[^/]+\.ts$/

const PAGE_RULES: ImportRules = {
  isForbidden: (file) => STORE.test(file) || PAGE_REALM.some((realm) => file.startsWith(realm)),
  isBoundary: (file) => PAGE_ADAPTERS.has(file),
}

describe("page swap modules", () => {
  it("read the pages only through the env and their adapters", () => {
    const offenders = PAGE_SWAP_MODULES.map(forbiddenChain(PAGE_RULES))
      .filter((chain) => chain !== null)
      .map((chain) => chain.join(" -> "))

    expect(offenders).toEqual([])
  })

  it("have no dynamic import", () => {
    const offenders = PAGE_SWAP_MODULES.filter((file) =>
      DYNAMIC_IMPORT.test(readFileSync(file, "utf8"))
    ).map((file) => relative(EXTENSION, file))

    expect(offenders).toEqual([])
  })
})
