import { describe, expect, it } from "vitest"

import { createRpcStub, getTestScaleApi } from "../__fixtures__/chains"

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

describe("getRuntimeCallValue", () => {
  it("runs the call at the given block", async () => {
    const rpc = createRpcStub(() => "0x05000000")
    const api = getTestScaleApi("polkadot", { send: rpc.send })

    const nonce = await api.getRuntimeCallValue<number>(
      "AccountNonceApi",
      "account_nonce",
      [ALICE],
      "0xaa"
    )

    expect(nonce).toBe(5)
    expect(rpc.calls).toEqual([
      {
        method: "state_call",
        params: ["AccountNonceApi_account_nonce", expect.any(String), "0xaa"],
      },
    ])
  })
})
