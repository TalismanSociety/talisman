import { describe, expect, it } from "vitest"

import { ETH_ERROR_EIP1474_INVALID_PARAMS } from "../EthProviderRpcError"
import { assertTypedDataTargetsChain, getTypedDataDomainChainId } from "../typedData"

const CONNECTED_CHAIN_ID = 1

const typedData = (chainId?: unknown, isChainIdDeclared = true) =>
  JSON.stringify({
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        ...(isChainIdDeclared ? [{ name: "chainId", type: "uint256" }] : []),
        { name: "verifyingContract", type: "address" },
      ],
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: "USD Coin",
      ...(chainId === undefined ? {} : { chainId }),
      verifyingContract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    },
    message: {
      owner: "0x1111111111111111111111111111111111111111",
      spender: "0x00000000000000000000000000000000deadbeef",
      value: (2n ** 256n - 1n).toString(),
    },
  })

const assertRejected = (message: string) => {
  try {
    assertTypedDataTargetsChain(message, CONNECTED_CHAIN_ID)
  } catch (err) {
    expect((err as { code: number }).code).toBe(ETH_ERROR_EIP1474_INVALID_PARAMS)
    return
  }
  throw new Error("Expected the typed data to be rejected")
}

describe("getTypedDataDomainChainId", () => {
  it.each([
    [1, 1],
    ["1", 1],
    ["0x89", 137],
  ])("parses %o as %i", (chainId, expected) => {
    expect(getTypedDataDomainChainId(typedData(chainId))).toBe(expected)
  })

  it("returns undefined when the domain isn't bound to a chain", () => {
    // a chainId the domain type doesn't declare isn't signed, whatever value the domain gives it
    expect(getTypedDataDomainChainId(typedData(1, false))).toBeUndefined()
    expect(getTypedDataDomainChainId(typedData(undefined, false))).toBeUndefined()
    expect(getTypedDataDomainChainId("not json")).toBeUndefined()
  })

  it("doesn't read a declared chainId the domain leaves out as the connected chain", () => {
    expect(getTypedDataDomainChainId(typedData())).toBe(0)
    expect(getTypedDataDomainChainId(typedData(null))).toBe(0)
  })
})

describe("assertTypedDataTargetsChain", () => {
  it("accepts a domain targeting the connected chain", () => {
    expect(() => assertTypedDataTargetsChain(typedData(1), CONNECTED_CHAIN_ID)).not.toThrow()
    expect(() => assertTypedDataTargetsChain(typedData("0x1"), CONNECTED_CHAIN_ID)).not.toThrow()
  })

  it("accepts a domain that isn't bound to a chain", () => {
    expect(() => assertTypedDataTargetsChain(typedData(1, false), CONNECTED_CHAIN_ID)).not.toThrow()
  })

  it("rejects a domain targeting another chain", () => {
    assertRejected(typedData(137))
    assertRejected(typedData("137"))
    assertRejected(typedData("0x89"))
    // a declared chainId the domain leaves out never resolves to the connected chain
    assertRejected(typedData())
  })

  it("rejects a chainId it cannot compare to the connected chain", () => {
    assertRejected(typedData("not a chain id"))
    assertRejected(typedData({}))
    assertRejected(typedData(`0x${"f".repeat(64)}`))
  })
})
