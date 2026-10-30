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

const isForbidden = (file: string) => file.startsWith(UI) || basename(file).startsWith("handler")

const forbiddenChain = (entry: string): string[] | null => {
  const parent = new Map<string, string | null>([[entry, null]])
  const queue = [entry]
  while (queue.length) {
    const file = queue.shift() as string
    const imports = file === entry ? ANY_IMPORT : RUNTIME_IMPORT
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
      queue.push(next)
    }
  }
  return null
}

describe("background swap modules", () => {
  it("reach nothing in ui/ and no handler", () => {
    const offenders = listSourceFiles(SWAPS, { includeTests: true })
      .map(forbiddenChain)
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
