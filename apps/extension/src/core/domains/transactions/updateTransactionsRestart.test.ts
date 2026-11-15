import type { Subscription } from "rxjs"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const nextIndex = vi.hoisted(() => vi.fn())
vi.mock("@core/rpcs/chain-connector-dot", () => ({
  chainConnectorDot: { send: (...args: unknown[]) => nextIndex(...args) },
}))
vi.mock("@core/rpcs/chain-connector-evm", () => ({ chainConnectorEvm: {} }))
vi.mock("@core/rpcs/chain-connector-sol", () => ({ chainConnectorSol: {} }))

import { db } from "@core/db"

import { cleanupAllDroppedTransactions } from "./cleanupDroppedTransactions"
import {
  addSubstrateTransaction,
  type TxStatusFact,
  txStatusFacts$,
  updateTransactionsRestart,
} from "./store.transactions"
import type { WalletTransactionDot } from "./types"

const ACCOUNT = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const HASH = `0x${"ab".repeat(32)}` as const
const PAYLOAD = {
  genesisHash: `0x${"11".repeat(32)}`,
  nonce: "0x00000007",
  address: ACCOUNT,
} as WalletTransactionDot["payload"]

const storedSuccess = (nonce: number): WalletTransactionDot => ({
  id: `old-${nonce}`,
  platform: "polkadot",
  networkId: "bittensor",
  account: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  status: "success",
  confirmed: true,
  hash: `0x${nonce.toString(16).padStart(64, "0")}`,
  nonce,
  payload: {} as WalletTransactionDot["payload"],
  timestamp: Date.now() - 3_600_000 - nonce,
})

const startUp = () => updateTransactionsRestart().then(() => cleanupAllDroppedTransactions())

let facts: TxStatusFact[]
let subscription: Subscription

beforeEach(async () => {
  await db.transactionsV2.clear()
  await db.transactionsV2.bulkPut(Array.from({ length: 99 }, (_, nonce) => storedSuccess(nonce)))
  facts = []
  nextIndex.mockReset()
  nextIndex.mockResolvedValue(7)
  subscription = txStatusFacts$.subscribe((fact) => facts.push(fact))
})

afterEach(() => subscription.unsubscribe())

it("keeps watching a transaction signed while the start-up sweep runs, before its dapp broadcasts it", async () => {
  const sweep = startUp()
  await addSubstrateTransaction("bittensor", HASH, PAYLOAD, { siteUrl: "https://dapp.example" })
  await sweep

  expect((await db.transactionsV2.get(HASH))?.status).toBe("pending")
  expect(facts).toEqual([])
})

it("still sweeps a transaction a previous service worker left pending", async () => {
  await addSubstrateTransaction("bittensor", HASH, PAYLOAD, { siteUrl: "https://dapp.example" })
  await db.transactionsV2.update(HASH, { timestamp: Date.now() - 60_000 })

  await startUp()

  expect((await db.transactionsV2.get(HASH))?.status).toBe("error")
  expect(facts.map((fact) => fact.reason)).toEqual(["dropped"])
})
