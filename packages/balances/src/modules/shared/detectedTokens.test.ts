import { firstValueFrom, type Subscription } from "rxjs"
import { describe, expect, it } from "vitest"

import { getDetectedTokensIds$, setDetectedTokenIds } from "./detectedTokens"

// Helpers: colon-separated format — `networkId:type[:extra]`
// EVM ERC20 contract addresses must be valid checksummed 0x + 40 hex chars
const evmErc20 = (contract: string) => `ethereum-mainnet:evm-erc20:${contract}` as const
const solSpl = (mint: string) => `solana-mainnet:sol-spl:${mint}` as const

const CONTRACT_1 = "0x1111111111111111111111111111111111111111"
const CONTRACT_2 = "0x2222222222222222222222222222222222222222"
const CONTRACT_3 = "0x9999999999999999999999999999999999999999"
const CONTRACT_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const CONTRACT_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const CONTRACT_C = "0xcccccccccccccccccccccccccccccccccccccccc"

// the store lives at module level: each test owns its addresses
let nextAddress = 0
const freshAddress = () => `0x${(++nextAddress).toString(16).padStart(4, "0")}`

describe("setDetectedTokenIds", () => {
  it("sets token IDs for an address", async () => {
    const address = freshAddress()
    const ids = [evmErc20(CONTRACT_1), evmErc20(CONTRACT_2)]
    setDetectedTokenIds(address, "evm-erc20", ids)

    const result = await firstValueFrom(getDetectedTokensIds$(address))
    expect(result).toEqual(ids)
  })

  it("overwrites token IDs of the same type for the same address", async () => {
    const address = freshAddress()
    setDetectedTokenIds(address, "evm-erc20", [evmErc20(CONTRACT_1)])
    setDetectedTokenIds(address, "evm-erc20", [evmErc20(CONTRACT_3)])

    const result = await firstValueFrom(getDetectedTokensIds$(address))
    expect(result).toEqual([evmErc20(CONTRACT_3)])
  })

  it("preserves token IDs of different types for the same address", async () => {
    const address = freshAddress()
    const erc20 = [evmErc20(CONTRACT_1)]
    const spl = [solSpl("MintABC")]

    setDetectedTokenIds(address, "evm-erc20", erc20)
    setDetectedTokenIds(address, "sol-spl", spl)

    const result = await firstValueFrom(getDetectedTokensIds$(address))
    expect(result).toEqual(expect.arrayContaining([...erc20, ...spl]))
    expect(result).toHaveLength(2)
  })

  it("handles multiple addresses independently", async () => {
    const addressA = freshAddress()
    const addressB = freshAddress()
    setDetectedTokenIds(addressA, "evm-erc20", [evmErc20(CONTRACT_1)])
    setDetectedTokenIds(addressB, "evm-erc20", [evmErc20(CONTRACT_2)])

    const resultA = await firstValueFrom(getDetectedTokensIds$(addressA))
    const resultB = await firstValueFrom(getDetectedTokensIds$(addressB))

    expect(resultA).toEqual([evmErc20(CONTRACT_1)])
    expect(resultB).toEqual([evmErc20(CONTRACT_2)])
  })

  it("sorts token IDs alphabetically", async () => {
    const address = freshAddress()
    const ids = [evmErc20(CONTRACT_C), evmErc20(CONTRACT_A), evmErc20(CONTRACT_B)]
    setDetectedTokenIds(address, "evm-erc20", ids)

    const result = await firstValueFrom(getDetectedTokensIds$(address))
    expect(result).toEqual([...ids].sort())
  })
})

describe("getDetectedTokensIds$", () => {
  it("emits empty array for unknown address", async () => {
    const result = await firstValueFrom(getDetectedTokensIds$("unknown-addr"))
    expect(result).toEqual([])
  })

  it("emits updated value after setDetectedTokenIds is called", async () => {
    const address = freshAddress()
    const emissions: string[][] = []
    const sub: Subscription = getDetectedTokensIds$(address).subscribe((v) => emissions.push(v))

    try {
      // initial empty emission
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toEqual([])

      setDetectedTokenIds(address, "evm-erc20", [evmErc20(CONTRACT_1)])
      expect(emissions).toHaveLength(2)
      expect(emissions[1]).toEqual([evmErc20(CONTRACT_1)])
    } finally {
      sub.unsubscribe()
    }
  })

  it("only emits when the value actually changes (distinctUntilChanged)", async () => {
    const address = freshAddress()
    let emissionCount = 0
    const sub: Subscription = getDetectedTokensIds$(address).subscribe(() => emissionCount++)

    try {
      expect(emissionCount).toBe(1) // initial []

      setDetectedTokenIds(address, "evm-erc20", [evmErc20(CONTRACT_1)])
      expect(emissionCount).toBe(2)

      // Set different address — should NOT cause emission for this address
      setDetectedTokenIds(freshAddress(), "evm-erc20", [evmErc20(CONTRACT_3)])
      expect(emissionCount).toBe(2)
    } finally {
      sub.unsubscribe()
    }
  })

  it("does NOT emit when same token IDs are set again", async () => {
    const address = freshAddress()
    const ids = [evmErc20(CONTRACT_1), evmErc20(CONTRACT_2)]

    let emissionCount = 0
    const sub: Subscription = getDetectedTokensIds$(address).subscribe(() => emissionCount++)

    try {
      expect(emissionCount).toBe(1) // initial []

      setDetectedTokenIds(address, "evm-erc20", ids)
      expect(emissionCount).toBe(2)

      // Set identical IDs again
      setDetectedTokenIds(address, "evm-erc20", ids)
      expect(emissionCount).toBe(2) // no new emission
    } finally {
      sub.unsubscribe()
    }
  })
})
