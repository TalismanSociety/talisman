import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * The swap screens work for any swap module: they reach a module through the registry in
 * `swaps.api.ts` and through what a quote's legs say in public. A screen that imports a
 * `*-swap-module.ts` file has started to depend on one module, and usually on the private `data`
 * that module keeps on its legs.
 */
const EXTENSION = join(REPO_ROOT, "apps/extension")
const SRC = join(EXTENSION, "src")
const SWAP = join(SRC, "ui/domains/Swap")
const SWAP_MODULES = join(SWAP, "swap-modules")

/** any way to name a module file: a static or a dynamic import, or a mock of one */
const MODULE_PATH = /["'][^"']*-swap-module["']/
const REGISTRY_FILES = /\/swaps\.api(\.test)?\.tsx?$/

describe("swap modules", () => {
  it("are imported only by each other and by the registry", () => {
    const offenders = listSourceFiles(SRC, { includeTests: true })
      .filter((file) => !file.startsWith(`${SWAP_MODULES}/`) && !REGISTRY_FILES.test(file))
      .filter((file) => file !== import.meta.filename)
      .filter((file) => MODULE_PATH.test(readFileSync(file, "utf8")))
      .map((file) => relative(EXTENSION, file))

    expect(offenders).toEqual([])
  })

  it("are recognised however a file names them, and the shared contract is not one", () => {
    // assembled, so that the guard tests that scan for imports and mocks do not read these as real ones
    const naming = (path: string) => [`from "${path}"`, `mock("${path}")`, `import('${path}')`]

    for (const line of naming("../swap-modules/lifi-swap-module"))
      expect(MODULE_PATH.test(line)).toBe(true)
    for (const line of naming("./common.swap-module")) expect(MODULE_PATH.test(line)).toBe(false)
  })
})
