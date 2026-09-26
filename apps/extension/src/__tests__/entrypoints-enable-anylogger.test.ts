import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { REPO_ROOT } from "./listSourceFiles"

/**
 * `@talismn/*` packages log through anylogger, which prints nothing until an adapter is
 * registered. Each extension context (background service worker, every UI page) is a separate
 * bundle, so each entrypoint must import `@common/enableAnyloggerLogsInDevelopment` itself, or
 * package logs in that context are silently dropped.
 *
 * `content.ts` and `page.ts` are exempt: they run inside dapp pages, whose console is not ours.
 */
const ENTRYPOINTS_DIR = join(REPO_ROOT, "apps/extension/entrypoints")

const ENABLE_ANYLOGGER = /^import\s+["']@common\/enableAnyloggerLogsInDevelopment["']/m

const listContextEntrypoints = () => [
  join(ENTRYPOINTS_DIR, "background.ts"),
  ...readdirSync(ENTRYPOINTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const [tsx, ts] = ["main.tsx", "main.ts"].map((name) =>
        join(ENTRYPOINTS_DIR, entry.name, name)
      )
      return existsSync(ts) ? ts : tsx
    }),
]

describe("extension entrypoints", () => {
  it("cover the background and every UI page", () => {
    expect(listContextEntrypoints().length).toBeGreaterThanOrEqual(5)
  })

  it("enable anylogger logs", () => {
    const offenders = listContextEntrypoints()
      .filter((file) => !existsSync(file) || !ENABLE_ANYLOGGER.test(readFileSync(file, "utf8")))
      .map((file) => relative(REPO_ROOT, file))

    expect(offenders).toEqual([])
  })
})
