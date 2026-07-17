import { describe, expect, it } from "vitest"

import { decryptPjsKeystore, encryptPjsKeystore } from "."

// generated with @polkadot/util-crypto 14.0.3 jsonEncrypt:
//   jsonEncrypt(Uint8Array 0..63, ["pkcs8","sr25519"], "talisman-test-password")
const PJS_VECTOR = {
  encoded:
    "5ylznAzHXnk1piVm4dPSyHXWhrUJxGvOex2wdYiHDGUAAAIAAQAAAAgAAAC8D/9gXrL2aP78BE1qajVTGi20bLhcPkdtupLjXjvpWZEs0zOxDNMd5mQMotdHyDw099H480J7P4IzESNv4C9OVpTGLHwBQGXnR4tmB60kFgqiSBG+8BwcWFzj1ZgjwCbuGXWysKLN7Q==",
  encoding: {
    content: ["pkcs8", "sr25519"],
    type: ["scrypt", "xsalsa20-poly1305"],
    version: "3",
  },
}

// same secret/password, encrypted with the pre-2024 polkadot-js scrypt default (N=1<<15) -
// real-world exports from older wallets carry these params and must remain importable
const PJS_LEGACY_PARAMS_VECTOR = {
  encoded:
    "ZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoMAgAAAAQAAAAgAAADIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/f0QFv9yj4Zcvvm59PMLjelJaER6lhaGnXcW53nTQCLlfhOncyUfIhJFcQnOodZw9W4DXMSs/H/apSIIdZVv6X6lMOC/MQAznDInWGan7jiw==",
  encoding: {
    content: ["pkcs8", "sr25519"],
    type: ["scrypt", "xsalsa20-poly1305"],
    version: "3",
  },
}

const SECRET = new Uint8Array(64).map((_, i) => i)
const PASSWORD = "talisman-test-password"

describe("pjs keystore (polkadot-js parity)", () => {
  it("decrypts a polkadot-js generated keystore", () => {
    expect(decryptPjsKeystore(PJS_VECTOR, PASSWORD)).toEqual(SECRET)
  })

  it("decrypts a keystore using legacy scrypt params", () => {
    expect(decryptPjsKeystore(PJS_LEGACY_PARAMS_VECTOR, PASSWORD)).toEqual(SECRET)
  })

  it("rejects a wrong password", () => {
    expect(() => decryptPjsKeystore(PJS_VECTOR, "wrong")).toThrow()
  })

  it("rejects disallowed scrypt params", () => {
    // patch N (u32 LE at offset 32) to a value outside the polkadot-js allowed list
    const bytes = Uint8Array.from(atob(PJS_VECTOR.encoded), (c) => c.charCodeAt(0))
    bytes[32] = 0
    bytes[33] = 4 // N = 1024
    const tampered = { ...PJS_VECTOR, encoded: btoa(String.fromCharCode(...bytes)) }
    expect(() => decryptPjsKeystore(tampered, PASSWORD)).toThrow(
      "Invalid injected scrypt params found"
    )
  })

  it("round-trips encrypt + decrypt", () => {
    const keystore = encryptPjsKeystore(SECRET, ["pkcs8", "sr25519"], PASSWORD)
    expect(keystore.encoding).toEqual(PJS_VECTOR.encoding)
    expect(decryptPjsKeystore(keystore, PASSWORD)).toEqual(SECRET)
  })
})
