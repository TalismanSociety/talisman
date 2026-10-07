import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { lineAt, listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * `$screen` names each screen after its route pattern. Only `<Routes>` from
 * `@ui/components/Routes` tells the screen tracker which pattern it matched: a react-router
 * `<Routes>` is invisible to it, so its screens would report their parent's pattern.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")
const WRAPPER = "ui/components/Routes.tsx"

const ROUTER_ROUTES_IMPORT =
  /import\s+\{[^}]*\bRoutes\b[^}]*\}\s+from\s+["']react-router(?:-dom)?["']/g

describe("screen tracking", () => {
  it("imports every <Routes> from @ui/components/Routes", () => {
    const violations = listSourceFiles(SRC, { includeTests: true })
      .filter((file) => relative(SRC, file) !== WRAPPER)
      .flatMap((file) => {
        const code = readFileSync(file, "utf8")
        return [...code.matchAll(ROUTER_ROUTES_IMPORT)].map(
          (match) => `${relative(SRC, file)}:${lineAt(code, match.index)}`
        )
      })

    expect(violations).toEqual([])
  })
})
