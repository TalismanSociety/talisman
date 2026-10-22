import { stringifyJsonWithBigInts } from "@solana/rpc-spec-types"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  solSend: vi.fn(),
}))

vi.mock("@ui/api", () => ({ api: { solSend: mocks.solSend } }))

import { getFrontEndSolanaRpc } from "./useSolanaRpc"

describe("background rpc transport", () => {
  it("relays requests as {id, method, params} and parses bigints losslessly from rawJson", async () => {
    const hugeValue = 2n ** 53n + 1n // not representable as a JS number

    mocks.solSend.mockImplementation(async (_networkId: string, _request: unknown) => ({
      rawJson: stringifyJsonWithBigInts({
        jsonrpc: "2.0",
        id: "backend-generated-id", // backend/kit coalescing can reuse another request's id
        result: { context: { slot: 123n }, value: hugeValue },
      }),
    }))

    const rpc = getFrontEndSolanaRpc("solana-mainnet")!
    const result = await rpc
      .getBalance("5xJvx7YrqCqgyzxx4PQXt1AVbxioUsGABf2zevmYC8UL" as never)
      .send()

    // request wire format
    expect(mocks.solSend).toHaveBeenCalledTimes(1)
    const [networkId, request] = mocks.solSend.mock.calls[0]!
    expect(networkId).toBe("solana-mainnet")
    expect(request).toMatchObject({ method: "getBalance" })
    expect(request.id).toBeDefined()
    expect(Array.isArray(request.params)).toBe(true)

    // bigint survives the messaging boundary losslessly
    expect(result.value).toBe(hugeValue)
  })
})
