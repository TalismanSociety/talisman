import type { BtcApi, EsploraAddressStats } from "@talismn/bitcoin"
import type { BtcNativeToken } from "@talismn/chaindata-provider"
import { deriveBitcoinAddressFromXpub } from "@talismn/crypto"
import { describe, expect, it, vi } from "vitest"

import { Balance } from "../../types"
import type { BtcAccountsMeta, TokensWithAddresses } from "../../types/IBalanceModule"
import { fetchBtcBalancesWithState } from "./fetchBalances"

// BIP84/BIP86 account 0 keys for the standard test mnemonic
const PAYMENTS_XPUB =
  "xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V"
const ORDINALS_XPUB =
  "xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ"

const TOKEN = {
  id: "bitcoin:btc-native",
  platform: "bitcoin",
  networkId: "bitcoin",
  type: "btc-native",
  symbol: "BTC",
  decimals: 8,
  name: "Bitcoin",
} as BtcNativeToken

const stats = (
  address: string,
  confirmed: number,
  mempool = 0,
  txCount = confirmed || mempool ? 1 : 0
): EsploraAddressStats => ({
  address,
  chain_stats: {
    funded_txo_count: confirmed ? 1 : 0,
    funded_txo_sum: Math.max(confirmed, 0),
    spent_txo_count: confirmed < 0 ? 1 : 0,
    spent_txo_sum: confirmed < 0 ? -confirmed : 0,
    tx_count: txCount,
  },
  mempool_stats: {
    funded_txo_count: mempool > 0 ? 1 : 0,
    funded_txo_sum: Math.max(mempool, 0),
    spent_txo_count: mempool < 0 ? 1 : 0,
    spent_txo_sum: mempool < 0 ? -mempool : 0,
    tx_count: mempool !== 0 ? 1 : 0,
  },
})

const buildApi = (statsByAddress: Record<string, EsploraAddressStats>): BtcApi => ({
  getTipHeight: vi.fn(async () => 800_000),
  getAddressStats: vi.fn(async (address: string) => statsByAddress[address] ?? stats(address, 0)),
  getAddressUtxos: vi.fn(async () => []),
  getTxStatus: vi.fn(),
  getTxHex: vi.fn(),
  getFeeEstimates: vi.fn(),
  broadcastTx: vi.fn(),
})

describe("btc-native fetchBalances", () => {
  it("aggregates dual-tree balances into one account row", async () => {
    const meta: BtcAccountsMeta = {
      [PAYMENTS_XPUB]: {
        trees: [
          { tree: "payments", xpub: PAYMENTS_XPUB, addressType: "p2wpkh" },
          { tree: "ordinals", xpub: ORDINALS_XPUB, addressType: "p2tr" },
        ],
      },
    }

    const payAddr0 = deriveBitcoinAddressFromXpub(PAYMENTS_XPUB, "p2wpkh", 0, 0, "bc")
    const ordAddr0 = deriveBitcoinAddressFromXpub(ORDINALS_XPUB, "p2tr", 0, 0, "bc")

    const api = buildApi({
      [payAddr0]: stats(payAddr0, 100_000, 25_000), // confirmed + incoming mempool
      [ordAddr0]: stats(ordAddr0, 40_000),
    })

    const tokensWithAddresses: TokensWithAddresses = [[TOKEN, [PAYMENTS_XPUB]]]
    const { results, state } = await fetchBtcBalancesWithState({
      networkId: "bitcoin",
      tokensWithAddresses,
      api,
      meta,
    })

    expect(results.errors).toHaveLength(0)
    expect(results.success).toHaveLength(1)

    const row = results.success[0]
    expect(row.address).toEqual(PAYMENTS_XPUB)

    const balance = new Balance(row)
    expect(balance.total.planck).toEqual(165_000n) // 100k + 40k confirmed + 25k pending
    expect(balance.free.planck).toEqual(140_000n)
    expect(balance.transferable.planck).toEqual(100_000n) // ordinals tree locked
    expect(balance.reserved.planck).toEqual(25_000n)

    expect(state.scans[PAYMENTS_XPUB]).toBeDefined()
    expect(state.scans[PAYMENTS_XPUB].trees).toHaveLength(2)
  })

  it("handles a bare xpub without metadata as single payments tree", async () => {
    const payAddr0 = deriveBitcoinAddressFromXpub(ORDINALS_XPUB, "p2wpkh", 0, 0, "bc")
    const api = buildApi({ [payAddr0]: stats(payAddr0, 5_000) })

    const { results } = await fetchBtcBalancesWithState({
      networkId: "bitcoin",
      tokensWithAddresses: [[TOKEN, [ORDINALS_XPUB]]],
      api,
    })

    const balance = new Balance(results.success[0])
    expect(balance.total.planck).toEqual(5_000n)
    expect(balance.transferable.planck).toEqual(5_000n)
  })

  it("handles plain on-chain addresses (WIF accounts)", async () => {
    const address = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"
    const api = buildApi({ [address]: stats(address, 7_500, -2_000) }) // outgoing pending spend

    const { results, state } = await fetchBtcBalancesWithState({
      networkId: "bitcoin",
      tokensWithAddresses: [[TOKEN, [address]]],
      api,
    })

    const balance = new Balance(results.success[0])
    expect(balance.total.planck).toEqual(5_500n) // outgoing mempool spend already deducted
    expect(state.plain[address]).toEqual({ confirmedSats: 7_500n, mempoolDeltaSats: -2_000n })
  })

  it("reports per-address errors without failing the batch", async () => {
    const good = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"
    const bad = "bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g"
    const api = buildApi({ [good]: stats(good, 1_000) })
    api.getAddressStats = vi.fn(async (address: string) => {
      if (address === bad) throw new Error("boom")
      return stats(address, address === good ? 1_000 : 0)
    })

    const { results } = await fetchBtcBalancesWithState({
      networkId: "bitcoin",
      tokensWithAddresses: [[TOKEN, [good, bad]]],
      api,
    })

    expect(results.success).toHaveLength(1)
    expect(results.errors).toHaveLength(1)
    expect(results.errors[0].address).toEqual(bad)
  })

  it("rejects non-bitcoin addresses", async () => {
    const api = buildApi({})
    await expect(() =>
      fetchBtcBalancesWithState({
        networkId: "bitcoin",
        tokensWithAddresses: [[TOKEN, ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]]],
        api,
      })
    ).rejects.toThrow("Invalid bitcoin address")
  })
})
