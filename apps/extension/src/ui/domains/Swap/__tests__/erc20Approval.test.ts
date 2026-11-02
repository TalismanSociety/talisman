import { describe, expect, it } from "vitest"

import { type MinedApproval, minedBlockOn, nonceAfter } from "../hooks/erc20Approval"

const FROM = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"
const OTHER = "0x1da2415229b614C787e145D1D7346eb496319C52"
const MINED: MinedApproval = { networkId: "8453", from: FROM, nonce: 377, blockNumber: 100n }

describe("nonceAfter", () => {
  it("is the nonce after the approval for its signer on its network, whatever the address case", () => {
    expect(nonceAfter(MINED, FROM.toLowerCase(), "8453")).toBe(378)
  })

  it.each([
    ["another network", FROM, "56"],
    ["another signer", OTHER, "8453"],
  ])("sets no floor on %s", (_, from, networkId) => {
    expect(nonceAfter(MINED, from, networkId)).toBeUndefined()
  })
})

describe("minedBlockOn", () => {
  it("is the approval's block for reads on its network by its signer", () => {
    expect(minedBlockOn(MINED, { chainId: 8453, fromAddress: FROM })).toBe(100n)
  })

  it.each([
    ["another network", { chainId: 56, fromAddress: FROM }],
    ["another signer", { chainId: 8453, fromAddress: OTHER }],
  ])("reads %s at its latest block", (_, approval) => {
    expect(minedBlockOn(MINED, approval)).toBeUndefined()
  })
})
