import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * viem's `recover*` and `verify*` signature helpers load secp256k1 with a dynamic `import()`. A
 * Chrome build wraps it in a module preload that reads `document`, so they throw in the service
 * worker, and only in a built extension: dev builds and tests never preload.
 *
 * `core/` recovers signers with `core/domains/ethereum/recoverSigner.ts`, which imports secp256k1
 * statically.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")

const VIEM_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']viem(?:\/[^"']*)?["']/g
const LAZY_SECP256K1 = /^(recover|verify)\w*$/

const lazySecp256k1Imports = (code: string) =>
  [...code.matchAll(VIEM_IMPORT)]
    .flatMap(([, names]) => names.split(","))
    .map((name) => name.trim().split(/\s+as\s+/)[0])
    .filter((name) => LAZY_SECP256K1.test(name))

describe("the background", () => {
  it("imports no viem helper that loads secp256k1 lazily", () => {
    const offenders = listSourceFiles(join(SRC, "core"))
      .map((file) => [relative(SRC, file), lazySecp256k1Imports(readFileSync(file, "utf8"))])
      .filter(([, names]) => names.length)

    expect(offenders).toEqual([])
  })

  it("would catch one", () => {
    expect(
      lazySecp256k1Imports('import { keccak256, recoverTransactionAddress } from "viem"')
    ).toEqual(["recoverTransactionAddress"])
  })
})
