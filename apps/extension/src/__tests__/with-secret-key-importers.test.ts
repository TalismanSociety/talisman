import { readFileSync } from "node:fs"
import { basename, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * `withSecretKey` hands a secret key to its callback. Only `pri(...)` handlers call it, so a key is
 * only ever used because a user acted in the UI or approved a dapp request. Nothing signs alone.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")

const IMPORTS_WITH_SECRET_KEY = /from\s+["'][^"']*\/withSecretKey["']/

const isAllowed = (file: string) =>
  basename(file).startsWith("handler") ||
  relative(SRC, file) === "core/domains/keyring/withSecretKey.ts"

describe("withSecretKey importers", () => {
  it("are handlers", () => {
    const offenders = listSourceFiles(SRC)
      .filter((file) => IMPORTS_WITH_SECRET_KEY.test(readFileSync(file, "utf8")))
      .filter((file) => !isAllowed(file))
      .map((file) => relative(SRC, file))

    expect(offenders).toEqual([])
  })
})
