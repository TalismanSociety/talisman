import { beforeEach, describe, expect, test, vi } from "vitest"

const {
  chainConnectorBtcMock,
  keyringStoreMock,
  inspectPsbtMock,
  isPsbtFullySignedMock,
  finalizeAndExtractMock,
  signPsbtWithKeysMock,
  withBitcoinSigningKeysMock,
  withSecretKeyMock,
  watchBitcoinTransactionMock,
  isAccountPlatformBitcoinMock,
} = vi.hoisted(() => ({
  chainConnectorBtcMock: { getApi: vi.fn() },
  keyringStoreMock: { getAccount: vi.fn() },
  inspectPsbtMock: vi.fn(),
  isPsbtFullySignedMock: vi.fn(),
  finalizeAndExtractMock: vi.fn(),
  signPsbtWithKeysMock: vi.fn(),
  withBitcoinSigningKeysMock: vi.fn(),
  withSecretKeyMock: vi.fn(),
  watchBitcoinTransactionMock: vi.fn(),
  isAccountPlatformBitcoinMock: vi.fn(),
}))

vi.mock("@talismn/bitcoin", () => ({
  BITCOIN_GAP_LIMIT: 20,
  inspectPsbt: inspectPsbtMock,
  isPsbtFullySigned: isPsbtFullySignedMock,
  finalizeAndExtract: finalizeAndExtractMock,
  signPsbtWithKeys: signPsbtWithKeysMock,
  keyPathFromDerivation: vi.fn(() => ({ tree: "payments", change: 0, index: 0 })),
  scanBitcoinAccount: vi.fn(),
  getSpendableUtxos: vi.fn(),
}))

vi.mock("@talismn/crypto", () => ({
  base64: { decode: vi.fn(() => new Uint8Array([1, 2, 3])) },
  deriveBitcoinAddressFromXpub: vi.fn(() => "bc1qderived"),
}))

vi.mock("@talismn/keyring", () => ({
  isAccountPlatformBitcoin: isAccountPlatformBitcoinMock,
}))

vi.mock("../keyring/store", () => ({ keyringStore: keyringStoreMock }))
vi.mock("../keyring/withBitcoinSigningKeys", () => ({
  withBitcoinSigningKeys: withBitcoinSigningKeysMock,
}))
vi.mock("../keyring/withSecretKey", () => ({ withSecretKey: withSecretKeyMock }))
vi.mock("../../rpcs/chain-connector-btc", () => ({ chainConnectorBtc: chainConnectorBtcMock }))
vi.mock("../transactions/watchBitcoinTransaction", () => ({
  watchBitcoinTransaction: watchBitcoinTransactionMock,
}))
vi.mock("./helpers", () => ({
  getBitcoinAccountTrees: vi.fn(() => [{ tree: "payments", xpub: "xpub", addressType: "p2wpkh" }]),
  getBtcNetworkHrp: vi.fn(() => "bc"),
  serializeBitcoinUtxo: vi.fn(),
}))
vi.mock("./store.addressIndex", () => ({
  bitcoinAddressIndexStore: { getLastIssued: vi.fn(), setLastIssued: vi.fn() },
}))

import { BitcoinExtensionHandler } from "./handler.extension"

describe("BitcoinExtensionHandler tx.submit guards", () => {
  const handler = new BitcoinExtensionHandler({} as never)
  const broadcastTx = vi.fn()

  const submit = (address = "xpub-identity") =>
    handler.handle("id", "pri(bitcoin.tx.submit)", {
      networkId: "bitcoin",
      address,
      psbtBase64: "cHNidA==",
      maxFeeSats: "10000",
    } as never)

  beforeEach(() => {
    vi.clearAllMocks()
    chainConnectorBtcMock.getApi.mockResolvedValue({ broadcastTx })
    isAccountPlatformBitcoinMock.mockReturnValue(true)
    inspectPsbtMock.mockReturnValue({
      inputs: [{ derivations: [{ fingerprint: "0x73c5da0a", path: [0] }], isTaproot: false }],
      feeSats: 500n,
    })
    isPsbtFullySignedMock.mockReturnValue(false)
    finalizeAndExtractMock.mockReturnValue({ txHex: "deadbeef", txid: "abc" })
  })

  test("refuses to send from a watched account", async () => {
    keyringStoreMock.getAccount.mockResolvedValue({
      type: "watch-only-bitcoin",
      address: "xpub-identity",
    })

    await expect(submit()).rejects.toThrow("Cannot send from a watched account")
    expect(broadcastTx).not.toHaveBeenCalled()
  })

  test("refuses an unsigned PSBT from a ledger account", async () => {
    keyringStoreMock.getAccount.mockResolvedValue({
      type: "ledger-bitcoin",
      address: "xpub-identity",
      masterFingerprint: "0x73c5da0a",
      keys: {
        payments: { derivationPath: "m/84'/0'/0'", xpub: "x" },
        ordinals: { derivationPath: "m/86'/0'/0'", xpub: "x" },
      },
    })
    isPsbtFullySignedMock.mockReturnValue(false)

    await expect(submit()).rejects.toThrow("has not been signed by the hardware device")
    expect(broadcastTx).not.toHaveBeenCalled()
  })

  test("rejects a fee above the stated maximum", async () => {
    keyringStoreMock.getAccount.mockResolvedValue({
      type: "hd-bitcoin",
      address: "xpub-identity",
      masterFingerprint: "0x73c5da0a",
      keys: {
        payments: { derivationPath: "m/84'/0'/0'", xpub: "x" },
        ordinals: { derivationPath: "m/86'/0'/0'", xpub: "x" },
      },
    })
    inspectPsbtMock.mockReturnValue({
      inputs: [{ derivations: [{ fingerprint: "0x73c5da0a", path: [0] }], isTaproot: false }],
      feeSats: 999_999n, // exceeds maxFeeSats 10000
    })

    await expect(submit()).rejects.toThrow(/exceeds maximum/)
    expect(broadcastTx).not.toHaveBeenCalled()
  })

  test("refuses an account not found", async () => {
    keyringStoreMock.getAccount.mockResolvedValue(null)
    await expect(submit()).rejects.toThrow("Account not found")
  })

  test("signs and broadcasts a valid hd-bitcoin transaction", async () => {
    keyringStoreMock.getAccount.mockResolvedValue({
      type: "hd-bitcoin",
      address: "xpub-identity",
      masterFingerprint: "0x73c5da0a",
      keys: {
        payments: { derivationPath: "m/84'/0'/0'", xpub: "x" },
        ordinals: { derivationPath: "m/86'/0'/0'", xpub: "x" },
      },
    })
    withBitcoinSigningKeysMock.mockResolvedValue({ unwrap: () => new Uint8Array([9]) })
    broadcastTx.mockResolvedValue("broadcast-txid")

    const result = await submit()

    expect(withBitcoinSigningKeysMock).toHaveBeenCalledTimes(1)
    expect(broadcastTx).toHaveBeenCalledWith("deadbeef")
    expect(watchBitcoinTransactionMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ txid: "broadcast-txid" })
  })

  test("broadcasts a fully-signed ledger PSBT without re-signing", async () => {
    keyringStoreMock.getAccount.mockResolvedValue({
      type: "ledger-bitcoin",
      address: "xpub-identity",
      masterFingerprint: "0x73c5da0a",
      keys: {
        payments: { derivationPath: "m/84'/0'/0'", xpub: "x" },
        ordinals: { derivationPath: "m/86'/0'/0'", xpub: "x" },
      },
    })
    isPsbtFullySignedMock.mockReturnValue(true)
    broadcastTx.mockResolvedValue("ledger-txid")

    const result = await submit()

    expect(withBitcoinSigningKeysMock).not.toHaveBeenCalled()
    expect(broadcastTx).toHaveBeenCalledWith("deadbeef")
    expect(result).toEqual({ txid: "ledger-txid" })
  })
})
