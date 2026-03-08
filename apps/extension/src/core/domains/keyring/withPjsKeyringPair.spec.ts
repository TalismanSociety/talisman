import { beforeEach, describe, expect, test, vi } from "vitest"

const {
  addFromPairMock,
  getAccountSecretKeyMock,
  getAccountMock,
  getPasswordMock,
  lockMock,
  removePairMock,
} = vi.hoisted(() => ({
  addFromPairMock: vi.fn(),
  getAccountSecretKeyMock: vi.fn(),
  getAccountMock: vi.fn(),
  getPasswordMock: vi.fn(),
  lockMock: vi.fn(),
  removePairMock: vi.fn(),
}))

vi.mock("@polkadot/keyring", () => ({
  default: class MockKeyring {
    addFromPair = addFromPairMock
    removePair = removePairMock
  },
}))

vi.mock("@talismn/crypto", () => ({
  getPublicKeyFromSecret: vi.fn(() => new Uint8Array([9, 9, 9])),
}))

vi.mock("../app/store.password", () => ({
  passwordStore: { getPassword: getPasswordMock, clearPassword: vi.fn() },
}))

vi.mock("./store", () => ({
  keyringStore: {
    getAccount: getAccountMock,
    getAccountSecretKey: getAccountSecretKeyMock,
  },
}))

vi.mock("./migration-utils", () => ({
  curveToPjsKeypairType: vi.fn(() => "sr25519"),
}))

import { withPjsKeyringPair } from "./withPjsKeyringPair"

describe("withPjsKeyringPair", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    addFromPairMock.mockReturnValue({ isLocked: false, lock: lockMock })
    getAccountMock.mockResolvedValue({
      type: "keypair",
      curve: "sr25519",
      name: "Test Account",
    })
    getPasswordMock.mockResolvedValue("password")
  })

  test("zeroizes the extracted secret key after use", async () => {
    const secretKey = new Uint8Array([1, 2, 3, 4])
    getAccountSecretKeyMock.mockResolvedValue(secretKey)

    const result = await withPjsKeyringPair("5abc", async () => "signed")

    expect(result.unwrap()).toBe("signed")
    expect(secretKey).toEqual(new Uint8Array([0, 0, 0, 0]))
    expect(lockMock).toHaveBeenCalledTimes(1)
    expect(removePairMock).toHaveBeenCalledWith("5abc")
  })
})
