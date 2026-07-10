import { deriveBitcoinAddressFromXpub } from "@talismn/crypto"
import { describe, expect, it, vi } from "vitest"

import type { BtcApi, EsploraAddressStats } from "../esplora/types"
import type { BitcoinTreeSpec } from "../types"
import {
  getScanCursor,
  getSpendableUtxos,
  refreshBitcoinAccountScan,
  scanBitcoinAccount,
} from "./scan"

// BIP84 account 0 zpub for the standard test mnemonic
const ZPUB =
  "zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs"

const TREE: BitcoinTreeSpec = { tree: "payments", xpub: ZPUB, addressType: "p2wpkh" }

const emptyStats = (address: string): EsploraAddressStats => ({
  address,
  chain_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
  mempool_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
})

const usedStats = (
  address: string,
  confirmedSats: number,
  mempoolSats = 0
): EsploraAddressStats => ({
  address,
  chain_stats: {
    funded_txo_count: 1,
    funded_txo_sum: confirmedSats,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 1,
  },
  mempool_stats: {
    funded_txo_count: mempoolSats ? 1 : 0,
    funded_txo_sum: mempoolSats,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: mempoolSats ? 1 : 0,
  },
})

const buildMockApi = (
  usedExternal: Record<number, { confirmed: number; mempool?: number }>,
  tipHeight = 800_000
): BtcApi & { statsCalls: string[] } => {
  const externalByAddress = new Map(
    Object.entries(usedExternal).map(([index, amounts]) => [
      deriveBitcoinAddressFromXpub(ZPUB, "p2wpkh", 0, Number(index), "bc"),
      amounts,
    ])
  )
  const statsCalls: string[] = []
  return {
    statsCalls,
    getTipHeight: vi.fn(async () => tipHeight),
    getAddressStats: vi.fn(async (address: string) => {
      statsCalls.push(address)
      const used = externalByAddress.get(address)
      return used ? usedStats(address, used.confirmed, used.mempool ?? 0) : emptyStats(address)
    }),
    getAddressUtxos: vi.fn(async (address: string) => {
      const used = externalByAddress.get(address)
      if (!used) return []
      return [
        {
          txid: "aa".repeat(32),
          vout: 0,
          value: used.confirmed,
          status: { confirmed: true, block_height: tipHeight - 2 },
        },
      ]
    }),
    getTxStatus: vi.fn(),
    getTxHex: vi.fn(),
    getFeeEstimates: vi.fn(),
    broadcastTx: vi.fn(),
  }
}

describe("scanBitcoinAccount", () => {
  it("finds used addresses and reports firstUnusedIndex", async () => {
    const api = buildMockApi({
      0: { confirmed: 10_000 },
      1: { confirmed: 5_000 },
      5: { confirmed: 7_000 },
    })
    const scan = await scanBitcoinAccount(api, { trees: [TREE], hrp: "bc" })

    const external = scan.trees[0].chains[0]
    expect(external.usedCount).toEqual(6)
    expect(external.firstUnusedIndex).toEqual(6)
    expect(external.activeAddresses.map((a) => a.index)).toEqual([0, 1, 5])
    expect(scan.trees[0].confirmedSats).toEqual(22_000n)
    expect(scan.tipHeight).toEqual(800_000)
  })

  it("extends the horizon past the initial gap window", async () => {
    // index 19 used → horizon extends to 40 → discovers index 25
    const api = buildMockApi({ 19: { confirmed: 1_000 }, 25: { confirmed: 2_000 } })
    const scan = await scanBitcoinAccount(api, { trees: [TREE], hrp: "bc" })

    const external = scan.trees[0].chains[0]
    expect(external.usedCount).toEqual(26)
    expect(external.activeAddresses.map((a) => a.index)).toEqual([19, 25])
  })

  it("warm start reduces work without missing balances", async () => {
    const api = buildMockApi({ 0: { confirmed: 10_000 }, 30: { confirmed: 3_000 } })
    const cold = await scanBitcoinAccount(api, { trees: [TREE], hrp: "bc" })
    // cold scan cannot see index 30 (gap from 0 ends at 21)
    expect(cold.trees[0].chains[0].usedCount).toEqual(1)

    const warm = await scanBitcoinAccount(api, {
      trees: [TREE],
      hrp: "bc",
      warmStart: { "payments:p2wpkh": [15, 0] },
    })
    // warm start 15 → horizon 35 → discovers index 30
    expect(warm.trees[0].chains[0].usedCount).toEqual(31)
    expect(warm.trees[0].confirmedSats).toEqual(13_000n)
    expect(getScanCursor(warm)["payments:p2wpkh"]).toEqual([31, 0])
  })

  it("counts incoming mempool separately", async () => {
    const api = buildMockApi({ 0: { confirmed: 10_000, mempool: 4_000 } })
    const scan = await scanBitcoinAccount(api, { trees: [TREE], hrp: "bc" })
    expect(scan.trees[0].confirmedSats).toEqual(10_000n)
    expect(scan.trees[0].mempoolDeltaSats).toEqual(4_000n)
  })
})

describe("refreshBitcoinAccountScan", () => {
  it("only re-checks active addresses + the frontier (no full gap sweep)", async () => {
    const api = buildMockApi({ 0: { confirmed: 10_000 } })
    const cold = await scanBitcoinAccount(api, { trees: [TREE], hrp: "bc" })
    const coldCalls = api.statsCalls.length // full gap sweep: external 0..20 + internal 0..19

    api.statsCalls.length = 0
    const refreshed = await refreshBitcoinAccountScan(api, cold, "bc")

    // external: active [0] + frontier [1]; internal: frontier [0] → 3 requests, not ~41
    expect(api.statsCalls.length).toEqual(3)
    expect(coldCalls).toBeGreaterThan(20)
    expect(refreshed.trees[0].confirmedSats).toEqual(10_000n)
    expect(refreshed.trees[0].chains[0].firstUnusedIndex).toEqual(1)
  })

  it("detects a new payment to the frontier and extends", async () => {
    const cold = await scanBitcoinAccount(buildMockApi({ 0: { confirmed: 10_000 } }), {
      trees: [TREE],
      hrp: "bc",
    })
    // a payment lands on the next unused address (index 1)
    const api = buildMockApi({ 0: { confirmed: 10_000 }, 1: { confirmed: 5_000 } })
    const refreshed = await refreshBitcoinAccountScan(api, cold, "bc")

    const external = refreshed.trees[0].chains[0]
    expect(external.activeAddresses.map((a) => a.index)).toEqual([0, 1])
    expect(external.firstUnusedIndex).toEqual(2)
    expect(refreshed.trees[0].confirmedSats).toEqual(15_000n)
  })

  it("picks up incoming mempool on a known active address", async () => {
    const cold = await scanBitcoinAccount(buildMockApi({ 0: { confirmed: 10_000 } }), {
      trees: [TREE],
      hrp: "bc",
    })
    const api = buildMockApi({ 0: { confirmed: 10_000, mempool: 3_000 } })
    const refreshed = await refreshBitcoinAccountScan(api, cold, "bc")

    expect(refreshed.trees[0].confirmedSats).toEqual(10_000n)
    expect(refreshed.trees[0].mempoolDeltaSats).toEqual(3_000n)
  })
})

describe("getSpendableUtxos", () => {
  it("returns utxos with derivation metadata and confirmations", async () => {
    const api = buildMockApi({ 2: { confirmed: 42_000 } })
    const scan = await scanBitcoinAccount(api, { trees: [TREE], hrp: "bc" })
    const utxos = await getSpendableUtxos(api, scan)

    expect(utxos).toHaveLength(1)
    expect(utxos[0]).toMatchObject({
      valueSats: 42_000n,
      tree: "payments",
      change: 0,
      index: 2,
      addressType: "p2wpkh",
      confirmations: 3,
    })
    expect(utxos[0].publicKey).toHaveLength(33)
    expect(utxos[0].address).toEqual(deriveBitcoinAddressFromXpub(ZPUB, "p2wpkh", 0, 2, "bc"))
  })

  it("filters by minConfirmations", async () => {
    const api = buildMockApi({ 2: { confirmed: 42_000 } })
    const scan = await scanBitcoinAccount(api, { trees: [TREE], hrp: "bc" })
    const utxos = await getSpendableUtxos(api, scan, { minConfirmations: 10 })
    expect(utxos).toHaveLength(0)
  })
})
