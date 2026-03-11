import { firstValueFrom, type Subscription } from "rxjs"
import { beforeEach, vi } from "vitest"

let setDetectedTokenIds: typeof import("./detectedTokens").setDetectedTokenIds
let getDetectedTokensIds$: typeof import("./detectedTokens").getDetectedTokensIds$

beforeEach(async () => {
  vi.resetModules()
  const mod = await import("./detectedTokens")
  setDetectedTokenIds = mod.setDetectedTokenIds
  getDetectedTokensIds$ = mod.getDetectedTokensIds$
})

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

const ADDR_A = "0xaaaa"
const ADDR_B = "0xbbbb"

describe("setDetectedTokenIds", () => {
  it("sets token IDs for an address", async () => {
    const ids = [evmErc20(CONTRACT_1), evmErc20(CONTRACT_2)]
    setDetectedTokenIds(ADDR_A, "evm-erc20", ids)

    const result = await firstValueFrom(getDetectedTokensIds$(ADDR_A))
    expect(result).toEqual(ids)
  })

  it("overwrites token IDs of the same type for the same address", async () => {
    setDetectedTokenIds(ADDR_A, "evm-erc20", [evmErc20(CONTRACT_1)])
    setDetectedTokenIds(ADDR_A, "evm-erc20", [evmErc20(CONTRACT_3)])

    const result = await firstValueFrom(getDetectedTokensIds$(ADDR_A))
    expect(result).toEqual([evmErc20(CONTRACT_3)])
  })

  it("preserves token IDs of different types for the same address", async () => {
    const erc20 = [evmErc20(CONTRACT_1)]
    const spl = [solSpl("MintABC")]

    setDetectedTokenIds(ADDR_A, "evm-erc20", erc20)
    setDetectedTokenIds(ADDR_A, "sol-spl", spl)

    const result = await firstValueFrom(getDetectedTokensIds$(ADDR_A))
    expect(result).toEqual(expect.arrayContaining([...erc20, ...spl]))
    expect(result).toHaveLength(2)
  })

  it("handles multiple addresses independently", async () => {
    setDetectedTokenIds(ADDR_A, "evm-erc20", [evmErc20(CONTRACT_1)])
    setDetectedTokenIds(ADDR_B, "evm-erc20", [evmErc20(CONTRACT_2)])

    const resultA = await firstValueFrom(getDetectedTokensIds$(ADDR_A))
    const resultB = await firstValueFrom(getDetectedTokensIds$(ADDR_B))

    expect(resultA).toEqual([evmErc20(CONTRACT_1)])
    expect(resultB).toEqual([evmErc20(CONTRACT_2)])
  })

  it("sorts token IDs alphabetically", async () => {
    const ids = [evmErc20(CONTRACT_C), evmErc20(CONTRACT_A), evmErc20(CONTRACT_B)]
    setDetectedTokenIds(ADDR_A, "evm-erc20", ids)

    const result = await firstValueFrom(getDetectedTokensIds$(ADDR_A))
    expect(result).toEqual([...ids].sort())
  })
})

describe("getDetectedTokensIds$", () => {
  it("emits current token IDs for the address", async () => {
    setDetectedTokenIds(ADDR_A, "evm-erc20", [evmErc20(CONTRACT_1)])

    const result = await firstValueFrom(getDetectedTokensIds$(ADDR_A))
    expect(result).toEqual([evmErc20(CONTRACT_1)])
  })

  it("emits empty array for unknown address", async () => {
    const result = await firstValueFrom(getDetectedTokensIds$("unknown-addr"))
    expect(result).toEqual([])
  })

  it("emits updated value after setDetectedTokenIds is called", async () => {
    const emissions: string[][] = []
    const sub: Subscription = getDetectedTokensIds$(ADDR_A).subscribe((v) => emissions.push(v))

    try {
      // initial empty emission
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toEqual([])

      setDetectedTokenIds(ADDR_A, "evm-erc20", [evmErc20(CONTRACT_1)])
      expect(emissions).toHaveLength(2)
      expect(emissions[1]).toEqual([evmErc20(CONTRACT_1)])
    } finally {
      sub.unsubscribe()
    }
  })

  it("only emits when the value actually changes (distinctUntilChanged)", async () => {
    let emissionCount = 0
    const sub: Subscription = getDetectedTokensIds$(ADDR_A).subscribe(() => emissionCount++)

    try {
      expect(emissionCount).toBe(1) // initial []

      setDetectedTokenIds(ADDR_A, "evm-erc20", [evmErc20(CONTRACT_1)])
      expect(emissionCount).toBe(2)

      // Set different address — should NOT cause emission for ADDR_A
      setDetectedTokenIds(ADDR_B, "evm-erc20", [evmErc20(CONTRACT_3)])
      expect(emissionCount).toBe(2)
    } finally {
      sub.unsubscribe()
    }
  })

  it("does NOT emit when same token IDs are set again", async () => {
    const ids = [evmErc20(CONTRACT_1), evmErc20(CONTRACT_2)]

    let emissionCount = 0
    const sub: Subscription = getDetectedTokensIds$(ADDR_A).subscribe(() => emissionCount++)

    try {
      expect(emissionCount).toBe(1) // initial []

      setDetectedTokenIds(ADDR_A, "evm-erc20", ids)
      expect(emissionCount).toBe(2)

      // Set identical IDs again
      setDetectedTokenIds(ADDR_A, "evm-erc20", ids)
      expect(emissionCount).toBe(2) // no new emission
    } finally {
      sub.unsubscribe()
    }
  })
})
