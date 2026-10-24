import { describe, expect, it, vi } from "vitest"

import { broadcastRaw, sendRaw } from "../broadcast"

const { mockSendRawTransaction } = vi.hoisted(() => ({ mockSendRawTransaction: vi.fn() }))

vi.mock("@core/rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: {
    getPublicClientForEvmNetwork: async () => ({ sendRawTransaction: mockSendRawTransaction }),
  },
}))

describe("sending a swap plan's signed bytes", () => {
  it.each(["already known", "nonce too low"])(
    "resends past a node that answers %s, and refuses fresh bytes with it",
    async (answer) => {
      mockSendRawTransaction.mockRejectedValue(new Error(answer))
      await expect(broadcastRaw("964", "0x02f8aa")).resolves.toBeUndefined()
      await expect(sendRaw("964", "0x02f8aa")).rejects.toThrow(answer)
    }
  )

  it("fails a resend the node refuses for any other reason", async () => {
    mockSendRawTransaction.mockRejectedValue(new Error("insufficient funds"))
    await expect(broadcastRaw("964", "0x02f8aa")).rejects.toThrow("insufficient funds")
  })
})
