import { str } from "scale-ts"
import { describe, expect, it } from "vitest"

import { createChainCode } from "./common"
import { getLegacyDerivationPath } from "./legacyDerivationPath"
import { addressFromMnemonic } from "./utils"

const POLKADOT_DEV = "bottom drive obey lake curtain smoke basket hold race lonely fit walk"

describe("getLegacyDerivationPath", () => {
  it.each([
    ["//hard///password", "//hard//password"],
    ["///password", "//password"],
    ["//hard///", "//hard"],
    ["//Alice-Bob", "//Alice"],
    ["//Alice Bob/1", "//Alice/1"],
    ["//日本", ""],
    [" //0", "//0"],
    ["//0x1000", "//4096"],
    ["//0X10", "//16"],
    ["//0b11", "//3"],
    ["//1e3", "//1000"],
    ["//Infinity", "//0"],
    ["//0x", "//7876616"],
    ["//a/0x", "//a/7876616"],
  ])("substrate %j holds the key of %j", (path, legacyPath) => {
    expect(getLegacyDerivationPath(path, "sr25519")).toBe(legacyPath)
  })

  it("gives the account earlier versions derived from a polkadot-js password path", async () => {
    const legacyPath = getLegacyDerivationPath("//hard///password", "sr25519") as string
    // what earlier versions derived from `//hard///password`, and what @polkadot/keyring 13
    // derives from `//hard//password`
    expect(await addressFromMnemonic(POLKADOT_DEV, legacyPath, "sr25519")).toBe(
      "5Cvf4R6qkEsSPeNrJS9PaynXEdPGM3ZBrwr2ubjJJ9C35jYS"
    )
  })

  it.each(["", "//0", "//hard//password", "/soft", "//0x10", "//4294967296"])(
    "leaves the accepted substrate path %j alone",
    (path) => {
      expect(getLegacyDerivationPath(path, "sr25519")).toBeUndefined()
    }
  )

  it("gives a bare 0x junction the decimal code with the chain code earlier versions used", () => {
    // earlier versions encoded the text `0x` as a SCALE string, zero-padded to 32 bytes
    const legacyChainCode = new Uint8Array(32)
    legacyChainCode.set(str.enc("0x"))
    expect(createChainCode("7876616")).toEqual(legacyChainCode)
  })

  it("has no answer when no current path derives the earlier key", () => {
    // ed25519 and ecdsa never derived soft junctions
    expect(getLegacyDerivationPath("//a-b/1", "ed25519")).toBeUndefined()
  })

  it.each([
    ["m/44'/501'/0abc'/0'", "m/44'/501'/0'/0'"],
    ["m/44'/501'/ 1'/0'", "m/44'/501'/1'/0'"],
    ["m/44'/501'/4294967296'/0'", "m/44'/501'/0'/0'"],
  ])("solana %j holds the key of %j", (path, legacyPath) => {
    expect(getLegacyDerivationPath(path, "solana")).toBe(legacyPath)
  })

  it.each(["m/44'/501'/0'/0'", "m/44'/501'/abc'/0'", "m/44'/501'/2147483648'/0'"])(
    "has no solana path for %j",
    (path) => {
      expect(getLegacyDerivationPath(path, "solana")).toBeUndefined()
    }
  )

  it("leaves ethereum paths alone", () => {
    expect(getLegacyDerivationPath("m/44'/60'/0'/0/0", "ethereum")).toBeUndefined()
    expect(getLegacyDerivationPath("junk", "ethereum")).toBeUndefined()
  })
})
