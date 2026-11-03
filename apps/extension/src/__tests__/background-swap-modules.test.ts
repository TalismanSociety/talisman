import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * `core/domains/swaps/` runs in the service worker as well as in the pages.
 *
 * - It reaches nothing in `ui/`, not even through another core file: the worker has no React, no
 *   `api` and no DOM. What a swap module reads from its realm comes in through `SwapEnv`
 *   (`core/domains/swaps/env.ts`), and the UI passes its own (`ui/domains/Swap/swapEnv.ui.ts`).
 * - It reaches no `handler*.ts`: the pages import these files too, and a handler in a page bundle
 *   runs the background's code there.
 * - It has no dynamic `import(`: Chrome forbids `import()` in a service worker, and the build
 *   would split the module into a chunk the worker cannot load.
 */
const EXTENSION = join(REPO_ROOT, "apps/extension")
const SRC = join(EXTENSION, "src")
const SWAPS = join(SRC, "core/domains/swaps")
const UI = join(SRC, "ui")

const RUNTIME_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm
const ANY_IMPORT = /^\s*(?:import|export)\s+(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm
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
  entryImports: RegExp
  isForbidden: (file: string) => boolean
  isBoundary: (file: string) => boolean
}

const BACKGROUND_RULES: ImportRules = {
  entryImports: ANY_IMPORT,
  isForbidden: (file) => file.startsWith(UI) || basename(file).startsWith("handler"),
  isBoundary: () => false,
}

const forbiddenChain =
  ({ entryImports, isForbidden, isBoundary }: ImportRules) =>
  (entry: string): string[] | null => {
    const parent = new Map<string, string | null>([[entry, null]])
    const queue = [entry]
    while (queue.length) {
      const file = queue.shift() as string
      const imports = file === entry ? entryImports : RUNTIME_IMPORT
      for (const [, specifier] of readFileSync(file, "utf8").matchAll(imports)) {
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

/**
 * The page swap modules are copied into the mobile wallet, so their bodies read the pages only
 * through `PageSwapEnv` and the per-repo adapter files next to them, which the walk does not enter.
 */
const SWAP_MODULES = join(SRC, "ui/domains/Swap/swap-modules")

const PAGE_SWAP_MODULES = [
  join(SWAP_MODULES, "lifi-swap-module.ts"),
  join(SWAP_MODULES, "stealthex-swap-module.ts"),
  join(SWAP_MODULES, "simpleswap-swap-module.ts"),
  join(SWAP_MODULES, "deposit-swap-transactions.ts"),
  join(SWAP_MODULES, "fee-utils.ts"),
  join(SWAP_MODULES, "monitoring.ts"),
  join(SWAPS, "status.ts"),
]

const PAGE_REALM = [
  join(UI, "state/"),
  join(UI, "api/"),
  join(UI, "util/gandalfFetch.ts"),
  join(SRC, "core/domains/app/store.remoteConfig.ts"),
  join(SRC, "ui/domains/Swap/hooks/"),
]

const PAGE_ADAPTERS = new Set([
  join(SWAP_MODULES, "lifi-api.ts"),
  join(SWAP_MODULES, "stealthex-api.ts"),
  join(SWAP_MODULES, "simpleswap-api.ts"),
  join(SWAP_MODULES, "substrate-deposit.ts"),
  join(SRC, "ui/domains/Swap/swapEnv.ui.ts"),
])

const PAGE_RULES: ImportRules = {
  entryImports: RUNTIME_IMPORT,
  isForbidden: (file) => PAGE_REALM.some((realm) => file.startsWith(realm)),
  isBoundary: (file) => PAGE_ADAPTERS.has(file),
}

describe("background swap modules", () => {
  it("reach nothing in ui/ and no handler", () => {
    const offenders = listSourceFiles(SWAPS, { includeTests: true })
      .map(forbiddenChain(BACKGROUND_RULES))
      .filter((chain) => chain !== null)
      .map((chain) => chain.join(" -> "))

    expect(offenders).toEqual([])
  })

  it("have no dynamic import", () => {
    const offenders = listSourceFiles(SWAPS)
      .filter((file) => DYNAMIC_IMPORT.test(readFileSync(file, "utf8")))
      .map((file) => relative(EXTENSION, file))

    expect(offenders).toEqual([])
  })
})

describe("page swap modules", () => {
  it("read the pages only through the env and their adapters", () => {
    const offenders = PAGE_SWAP_MODULES.map(forbiddenChain(PAGE_RULES))
      .filter((chain) => chain !== null)
      .map((chain) => chain.join(" -> "))

    expect(offenders).toEqual([])
  })
})
