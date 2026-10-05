import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * Error reporting has one seam per realm, each with the same `reportError`.
 *
 * - `core/domains/analytics/errorReporting` runs the intake and imports the engine and the
 *   keyring store. A page that reaches it, even through a core module, bundles a second engine and
 *   crashes on load ("Keyring store should only be accessed from the background thread"). Pages
 *   use `@ui/api/errorReporting`, which sends the report over the port. A core module that pages
 *   import (the password store, notifications) cannot report: log instead.
 * - `@ui/api/errorReporting` needs the page's `api` and `pageContext`: the worker has neither.
 * - The builder (`@common/analytics/exceptionReport`, `@posthog/core`) stays out of `inject/` and
 *   the content and page scripts. It reads `globalThis._posthogChunkIds`, which in `page.js` is the
 *   dapp's own window, and those files get no chunk ids.
 */
const EXTENSION = join(REPO_ROOT, "apps/extension")
const SRC = join(EXTENSION, "src")
const WORKER_SEAM = join(SRC, "core/domains/analytics/errorReporting.ts")
const PAGES = ["dashboard", "popup", "onboarding", "support"].map((page) =>
  join(EXTENSION, "entrypoints", page, "main.tsx")
)

const PAGE_SEAM = /from\s+["']@ui\/api\/errorReporting["']/
const BUILDER = /from\s+["'](?:@common\/analytics\/exceptionReport|@posthog\/)/
const RUNTIME_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm
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

const importChain = (entry: string, target: string): string[] | null => {
  const parent = new Map<string, string | null>([[entry, null]])
  const queue = [entry]
  while (queue.length) {
    const file = queue.shift() as string
    if (file === target) {
      const chain: string[] = []
      for (let at: string | null | undefined = file; at; at = parent.get(at))
        chain.unshift(relative(EXTENSION, at))
      return chain
    }
    for (const [, specifier] of readFileSync(file, "utf8").matchAll(RUNTIME_IMPORT)) {
      const next = resolveImport(file, specifier)
      if (next && !parent.has(next)) {
        parent.set(next, file)
        queue.push(next)
      }
    }
  }
  return null
}

const offenders = (files: string[], specifier: RegExp) =>
  files
    .filter((file) => specifier.test(readFileSync(file, "utf8")))
    .map((file) => relative(EXTENSION, file))

describe("error reporting realms", () => {
  it.each(PAGES.map((page) => [relative(EXTENSION, page), page]))(
    "%s cannot reach the worker seam",
    (_, page) => {
      expect(importChain(page, WORKER_SEAM)?.join(" -> ") ?? null).toBeNull()
    }
  )

  it("keeps the page seam out of core/", () => {
    expect(offenders(listSourceFiles(join(SRC, "core")), PAGE_SEAM)).toEqual([])
  })

  it("keeps the builder out of inject/ and the content and page scripts", () => {
    const files = [
      ...listSourceFiles(join(SRC, "inject")),
      join(EXTENSION, "entrypoints/content.ts"),
      join(EXTENSION, "entrypoints/page.ts"),
    ]
    expect(offenders(files, BUILDER)).toEqual([])
  })
})
