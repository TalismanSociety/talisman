import { keccak256 } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { broadcastRaw, sendRaw } from "../broadcast"

const RAW = "0x02f8aa"

const { mockSendRawTransaction, mockGetTransaction } = vi.hoisted(() => ({
  mockSendRawTransaction: vi.fn(),
  mockGetTransaction: vi.fn(),
}))

vi.mock("@core/rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: {
    getPublicClientForEvmNetwork: async () => ({
      sendRawTransaction: mockSendRawTransaction,
      getTransaction: mockGetTransaction,
    }),
  },
}))

describe("sending a swap plan's signed bytes", () => {
  beforeEach(() => {
    mockGetTransaction.mockRejectedValue(new Error("not found"))
  })

  it.each(["already known", "nonce too low"])(
    "resends past a node that answers %s, and refuses fresh bytes with it",
    async (answer) => {
      mockSendRawTransaction.mockRejectedValue(new Error(answer))
      await expect(broadcastRaw("964", RAW)).resolves.toBeUndefined()
      await expect(sendRaw("964", RAW)).rejects.toThrow(answer)
    }
  )

  it("sends fresh bytes a resend already brought to the node", async () => {
    mockSendRawTransaction.mockRejectedValue(new Error("already known"))
    mockGetTransaction.mockImplementation(async ({ hash }) =>
      hash === keccak256(RAW) ? { hash } : Promise.reject(new Error("not found"))
    )
    await expect(sendRaw("964", RAW)).resolves.toBeUndefined()
  })

  it("fails a resend the node refuses for any other reason", async () => {
    mockSendRawTransaction.mockRejectedValue(new Error("insufficient funds"))
    await expect(broadcastRaw("964", RAW)).rejects.toThrow("insufficient funds")
  })
})
