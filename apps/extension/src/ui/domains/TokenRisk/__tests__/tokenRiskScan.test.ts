import type { Token } from "@talismn/chaindata-provider"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGandalfFetch = vi.fn()

vi.mock("@ui/util/gandalfFetch", () => ({
  gandalfFetch: (...args: unknown[]) => mockGandalfFetch(...args),
}))

import {
  fetchTokenRiskScan,
  getTokenRiskRef,
  type TokenRiskScan,
  tokenRiskScanQueryOptions,
  UNKNOWN_TOKEN_RISK,
} from "../tokenRiskScan"

const ERC20 = {
  id: "1:evm-erc20:0xdac17f958d2ee523a2206206994597c13d831ec7",
  type: "evm-erc20",
  networkId: "1",
  contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
} as unknown as Token

const SPL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const SPL = {
  id: `solana-mainnet:sol-spl:${SPL_MINT}`,
  type: "sol-spl",
  networkId: "solana-mainnet",
  mintAddress: SPL_MINT,
} as unknown as Token

const hit = (resultType: string, fields: Record<string, unknown> = {}) => ({
  status: "hit",
  resultType,
  features: [{ id: "HIGH_REPUTATION_TOKEN", type: "Benign", description: "Reputable" }],
  fees: { buy: 0, sell: 0.05 },
  financialStats: { holdersCount: 10 },
  cachedAt: "2026-09-18T00:00:00.000Z",
  ttlSeconds: 60,
  ...fields,
})

const respond = (results: Record<string, unknown>) =>
  mockGandalfFetch.mockResolvedValue(Response.json({ results }))

const sentTokens = (call = 0) =>
  JSON.parse(mockGandalfFetch.mock.calls[call][1].body as string).tokens as {
    chain: string
    address: string
  }[]

describe("getTokenRiskRef", () => {
  it("maps ERC20 tokens to a lowercase address on the Blockaid chain name", () => {
    expect(getTokenRiskRef(ERC20)).toEqual({
      chain: "ethereum",
      address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    })
  })

  it("keeps the case of Solana mints", () => {
    expect(getTokenRiskRef(SPL)).toEqual({ chain: "solana", address: SPL_MINT })
  })

  it("ignores native, substrate and uncovered-network tokens", () => {
    expect(getTokenRiskRef({ ...ERC20, type: "evm-native" } as Token)).toBeNull()
    expect(getTokenRiskRef({ ...ERC20, networkId: "11155111" } as Token)).toBeNull()
    expect(getTokenRiskRef({ ...SPL, networkId: "solana-devnet" } as Token)).toBeNull()
    expect(getTokenRiskRef({ type: "substrate-assets", networkId: "polkadot" } as Token)).toBeNull()
    expect(getTokenRiskRef(null)).toBeNull()
  })
})

describe("fetchTokenRiskScan", () => {
  beforeEach(() => {
    mockGandalfFetch.mockReset()
  })

  it("merges same-tick requests into one deduplicated POST", async () => {
    const ethereum = getTokenRiskRef(ERC20)!
    const solana = getTokenRiskRef(SPL)!
    respond({
      [`ethereum:${ethereum.address}`]: hit("Benign"),
      [`solana:${solana.address}`]: hit("Malicious"),
    })

    const [first, second, third] = await Promise.all([
      fetchTokenRiskScan(ethereum),
      fetchTokenRiskScan(solana),
      fetchTokenRiskScan(ethereum),
    ])

    expect(mockGandalfFetch).toHaveBeenCalledTimes(1)
    expect(mockGandalfFetch.mock.calls[0][0]).toBe("https://bap.talisman.xyz/token/scan")
    expect(sentTokens()).toEqual([ethereum, solana])
    expect(first).toEqual({
      verdict: "Benign",
      features: [{ id: "HIGH_REPUTATION_TOKEN", type: "Benign", description: "Reputable" }],
      fees: { buy: 0, sell: 0.05 },
      financialStats: { holdersCount: 10 },
    })
    expect(second.verdict).toBe("Malicious")
    expect(third).toBe(first)
  })

  it("splits more than 100 tokens across requests", async () => {
    respond({})
    const refs = Array.from({ length: 101 }, (_, i) => ({
      chain: "ethereum",
      address: `0x${i.toString(16).padStart(40, "0")}`,
    }))

    await Promise.all(refs.map(fetchTokenRiskScan))

    expect(mockGandalfFetch).toHaveBeenCalledTimes(2)
    expect(sentTokens(0)).toHaveLength(100)
    expect(sentTokens(1)).toHaveLength(1)
  })

  it.each(["error", "unsupported"])("treats a %s status as unknown", async (status) => {
    const ref = getTokenRiskRef(ERC20)!
    respond({ [`ethereum:${ref.address}`]: { status, cachedAt: "", ttlSeconds: 60 } })
    expect(await fetchTokenRiskScan(ref)).toBe(UNKNOWN_TOKEN_RISK)
  })

  it("treats a miss status as unknown with a pending scan", async () => {
    const ref = getTokenRiskRef(ERC20)!
    respond({ [`ethereum:${ref.address}`]: { status: "miss", cachedAt: "", ttlSeconds: 60 } })
    expect(await fetchTokenRiskScan(ref)).toEqual({ ...UNKNOWN_TOKEN_RISK, isScanPending: true })
  })

  it("keeps unknown results fresh for a shorter time than verdicts", () => {
    const { staleTime } = tokenRiskScanQueryOptions(getTokenRiskRef(ERC20))
    const getStaleTime = (data: TokenRiskScan) =>
      typeof staleTime === "function" ? staleTime({ state: { data } } as never) : staleTime

    expect(getStaleTime(UNKNOWN_TOKEN_RISK)).toBeLessThan(
      getStaleTime({ ...UNKNOWN_TOKEN_RISK, verdict: "Malicious" }) as number
    )
  })

  it("treats a missing result as unknown", async () => {
    respond({})
    expect(await fetchTokenRiskScan(getTokenRiskRef(ERC20)!)).toBe(UNKNOWN_TOKEN_RISK)
  })

  it.each([
    ["a failed request", () => mockGandalfFetch.mockRejectedValue(new Error("offline"))],
    [
      "an error status",
      () => mockGandalfFetch.mockResolvedValue(Response.json({}, { status: 429 })),
    ],
    ["an invalid body", () => mockGandalfFetch.mockResolvedValue(Response.json({ results: 1 }))],
  ])("resolves every token as unknown after %s", async (_label, arrange) => {
    arrange()
    const scans = await Promise.all([
      fetchTokenRiskScan(getTokenRiskRef(ERC20)!),
      fetchTokenRiskScan(getTokenRiskRef(SPL)!),
    ])
    expect(scans).toEqual([UNKNOWN_TOKEN_RISK, UNKNOWN_TOKEN_RISK])
  })
})
