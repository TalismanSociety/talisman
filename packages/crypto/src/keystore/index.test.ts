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

const SECRET = new Uint8Array(64).map((_, i) => i)
const PASSWORD = "talisman-test-password"

describe("pjs keystore (polkadot-js parity)", () => {
  it("decrypts a polkadot-js generated keystore", () => {
    expect(decryptPjsKeystore(PJS_VECTOR, PASSWORD)).toEqual(SECRET)
  })

  it("rejects a wrong password", () => {
    expect(() => decryptPjsKeystore(PJS_VECTOR, "wrong")).toThrow()
  })

  it("round-trips encrypt + decrypt", () => {
    const keystore = encryptPjsKeystore(SECRET, ["pkcs8", "sr25519"], PASSWORD)
    expect(keystore.encoding).toEqual(PJS_VECTOR.encoding)
    expect(decryptPjsKeystore(keystore, PASSWORD)).toEqual(SECRET)
  })
})
