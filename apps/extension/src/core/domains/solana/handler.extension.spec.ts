import { Err } from "ts-results"
import { beforeEach, describe, expect, test, vi } from "vitest"

const {
  chainConnectorSolMock,
  deserializeTransactionMock,
  getVerifiedTransactionSignatureMock,
  keyringStoreMock,
  parseTransactionInfoMock,
  requestStoreMock,
  watchSolanaTransactionMock,
  withSecretKeyMock,
} = vi.hoisted(() => ({
  chainConnectorSolMock: { getRpc: vi.fn() },
  deserializeTransactionMock: vi.fn(),
  getVerifiedTransactionSignatureMock: vi.fn(),
  keyringStoreMock: { getAccount: vi.fn() },
  parseTransactionInfoMock: vi.fn(),
  requestStoreMock: { getRequest: vi.fn() },
  watchSolanaTransactionMock: vi.fn(),
  withSecretKeyMock: vi.fn(),
}))

vi.mock("@talismn/solana", () => ({
  deserializeTransaction: deserializeTransactionMock,
  getVerifiedTransactionSignature: getVerifiedTransactionSignatureMock,
  parseTransactionInfo: parseTransactionInfoMock,
  serializeTransaction: vi.fn(() => "serialized-transaction"),
  signTransactionWithSecretKey: vi.fn((tx: unknown) => tx),
}))

vi.mock("../keyring/store", () => ({
  keyringStore: keyringStoreMock,
}))

vi.mock("../keyring/withSecretKey", () => ({
  withSecretKey: withSecretKeyMock,
}))

vi.mock("../../rpcs/chain-connector-sol", () => ({
  chainConnectorSol: chainConnectorSolMock,
}))

vi.mock("../../libs/requests/store", () => ({
  requestStore: requestStoreMock,
}))

vi.mock("../transactions/watchSolanaTransaction", () => ({
  watchSolanaTransaction: watchSolanaTransactionMock,
}))

import { SolanaExtensionHandler } from "./handler.extension"

describe("SolanaExtensionHandler", () => {
  const handler = new SolanaExtensionHandler({} as never)
  const sendTransaction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    chainConnectorSolMock.getRpc.mockResolvedValue({
      sendTransaction: (...args: unknown[]) => ({ send: () => sendTransaction(...args) }),
    })
    getVerifiedTransactionSignatureMock.mockReturnValue(null)
    keyringStoreMock.getAccount.mockResolvedValue({ address: "sol-address", type: "keypair" })
    withSecretKeyMock.mockResolvedValue(Err("Unauthorised"))
  })

  test("does not submit a transaction when signing fails", async () => {
    const tx = { messageBytes: new Uint8Array([1, 2, 3]), signatures: {} }

    deserializeTransactionMock.mockReturnValue(tx)
    parseTransactionInfoMock.mockReturnValue({ address: "sol-address", signature: undefined })

    await expect(
      handler.handle("id", "pri(solana.rpc.submit)", {
        networkId: "solana-testnet",
        transaction: "encoded-transaction",
      } as never)
    ).rejects.toBeDefined()

    expect(withSecretKeyMock).toHaveBeenCalledTimes(1)
    expect(sendTransaction).not.toHaveBeenCalled()
    expect(watchSolanaTransactionMock).not.toHaveBeenCalled()
  })

  test("does not resolve or send a transaction approval when signing fails", async () => {
    const tx = { messageBytes: new Uint8Array([4, 5, 6]), signatures: {} }
    const resolve = vi.fn()

    deserializeTransactionMock.mockReturnValue(tx)
    requestStoreMock.getRequest.mockReturnValue({
      account: { address: "sol-address", type: "keypair" },
      request: { type: "transaction", transaction: "encoded-transaction", send: true },
      resolve,
    })

    await expect(
      handler.handle("id", "pri(solana.sign.approve)", {
        id: "sol-sign.1",
        type: "transaction",
        networkId: "solana-testnet",
      } as never)
    ).rejects.toBeDefined()

    expect(withSecretKeyMock).toHaveBeenCalledTimes(1)
    expect(sendTransaction).not.toHaveBeenCalled()
    expect(resolve).not.toHaveBeenCalled()
  })

  test("resolves a hardware-signed transaction without touching the keyring", async () => {
    const signature = new Uint8Array(64).fill(1)
    const tx = { messageBytes: new Uint8Array([7, 8, 9]), signatures: { "sol-address": signature } }
    const resolve = vi.fn()

    deserializeTransactionMock.mockReturnValue(tx)
    getVerifiedTransactionSignatureMock.mockReturnValue(signature)
    sendTransaction.mockResolvedValue("tx-signature")
    requestStoreMock.getRequest.mockReturnValue({
      account: { address: "sol-address", type: "ledger-solana" },
      request: { type: "transaction", transaction: "encoded-transaction", send: true },
      resolve,
    })

    await handler.handle("id", "pri(solana.sign.approve)", {
      id: "sol-sign.1",
      type: "transaction",
      networkId: "solana-testnet",
      transaction: "signed-transaction",
    } as never)

    expect(getVerifiedTransactionSignatureMock).toHaveBeenCalledWith(tx, "sol-address")
    expect(withSecretKeyMock).not.toHaveBeenCalled()
    expect(resolve).toHaveBeenCalledWith({
      type: "transaction",
      transaction: "serialized-transaction",
      signature: "tx-signature",
      networkId: "solana-testnet",
    })
  })

  test("rejects an unsigned transaction for a hardware account without touching the keyring", async () => {
    const tx = { messageBytes: new Uint8Array([7, 8, 9]), signatures: {} }
    const resolve = vi.fn()

    deserializeTransactionMock.mockReturnValue(tx)
    requestStoreMock.getRequest.mockReturnValue({
      account: { address: "sol-address", type: "ledger-solana" },
      request: { type: "transaction", transaction: "encoded-transaction", send: true },
      resolve,
    })

    await expect(
      handler.handle("id", "pri(solana.sign.approve)", {
        id: "sol-sign.1",
        type: "transaction",
        networkId: "solana-testnet",
      } as never)
    ).rejects.toThrow("hardware device")

    expect(withSecretKeyMock).not.toHaveBeenCalled()
    expect(sendTransaction).not.toHaveBeenCalled()
    expect(resolve).not.toHaveBeenCalled()
  })
})
