import { Err } from "ts-results"
import { beforeEach, describe, expect, test, vi } from "vitest"

const {
  chainConnectorSolMock,
  deserializeTransactionMock,
  keyringStoreMock,
  parseTransactionInfoMock,
  requestStoreMock,
  watchSolanaTransactionMock,
  withSecretKeyMock,
} = vi.hoisted(() => ({
  chainConnectorSolMock: { getRpc: vi.fn() },
  deserializeTransactionMock: vi.fn(),
  keyringStoreMock: { getAccount: vi.fn() },
  parseTransactionInfoMock: vi.fn(),
  requestStoreMock: { getRequest: vi.fn() },
  watchSolanaTransactionMock: vi.fn(),
  withSecretKeyMock: vi.fn(),
}))

vi.mock("@talismn/solana", () => ({
  deserializeTransaction: deserializeTransactionMock,
  getKeypair: vi.fn(),
  isVersionedTransaction: vi.fn(() => false),
  parseTransactionInfo: parseTransactionInfoMock,
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
    keyringStoreMock.getAccount.mockResolvedValue({ address: "sol-address" })
    withSecretKeyMock.mockResolvedValue(Err("Unauthorised"))
  })

  test("does not submit a transaction when signing fails", async () => {
    const tx = {
      serialize: vi.fn(() => new Uint8Array([1, 2, 3])),
      sign: vi.fn(),
    }

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
    const tx = {
      serialize: vi.fn(() => new Uint8Array([4, 5, 6])),
      sign: vi.fn(),
    }
    const resolve = vi.fn()

    deserializeTransactionMock.mockReturnValue(tx)
    parseTransactionInfoMock.mockReturnValue({ signature: undefined })
    requestStoreMock.getRequest.mockReturnValue({
      account: { address: "sol-address" },
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
})
