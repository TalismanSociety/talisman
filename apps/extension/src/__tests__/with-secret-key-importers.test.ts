import { readFileSync } from "node:fs"
import { basename, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * `withSecretKey` hands a secret key to its callback. Every caller today sits in a `pri(...)`
 * handler, so a key is only ever used because a user acted in the UI or approved a dapp request.
 *
 * The one exception is `core/domains/swaps/plans/sign.ts`: the swap plan executor signs a later leg
 * of a plan the user approved once, within the bound admission checks. Keep it the only one. A new
 * autonomous signer needs the same review: a persisted approval, a bound, and an admission step.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")

const ALLOWED = ["core/domains/keyring/withSecretKey.ts", "core/domains/swaps/plans/sign.ts"]

const IMPORTS_WITH_SECRET_KEY = /from\s+["'][^"']*\/withSecretKey["']/

const isAllowed = (file: string) =>
  basename(file).startsWith("handler") || ALLOWED.includes(relative(SRC, file))

describe("withSecretKey importers", () => {
  it("are handlers and the swap plan signer", () => {
    const offenders = listSourceFiles(SRC)
      .filter((file) => IMPORTS_WITH_SECRET_KEY.test(readFileSync(file, "utf8")))
      .filter((file) => !isAllowed(file))
      .map((file) => relative(SRC, file))

    expect(offenders).toEqual([])
  })

  it("still include the swap plan signer", () => {
    const signer = join(SRC, "core/domains/swaps/plans/sign.ts")
    expect(IMPORTS_WITH_SECRET_KEY.test(readFileSync(signer, "utf8"))).toBe(true)
  })
})
