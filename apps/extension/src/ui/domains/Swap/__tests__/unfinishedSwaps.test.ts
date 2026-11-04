import { appStore, type UnfinishedSwap } from "@core/domains/app/store.app"
import { beforeEach, describe, expect, it } from "vitest"

import { quoteFromLegs } from "../swap-modules/helpers"
import type { RunLeg, SwapRun } from "../swap-modules/swap-run"
import {
  saveUnfinishedSwap,
  unfinishedSwapOf,
  withoutHeldFunds,
  withRunNote,
} from "../unfinishedSwaps"

const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const SUB_TAO = "bittensor:substrate-native"
const HUB_TAO = "964:evm-native"
const BASE_WTAO = "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"
const LEG0_HASH = `0x${"11".repeat(32)}` as const
const LEG1_HASH = `0x${"22".repeat(32)}` as const

const QUOTE = quoteFromLegs(
  [
    {
      protocol: "bittensor-evm",
      fromTokenId: SUB_TAO,
      toTokenId: HUB_TAO,
      signer: SUB_ADDRESS,
      recipient: EVM_ADDRESS,
      inputAmount: 1_000_000_000n,
      outputAmount: 999_999_500_000_000_000n,
      fees: [],
      timeInSec: 12,
    },
    {
      protocol: "forevermoney",
      fromTokenId: HUB_TAO,
      toTokenId: BASE_WTAO,
      signer: EVM_ADDRESS,
      recipient: RECIPIENT,
      inputAmount: 999_999_500_000_000_000n,
      outputAmount: 990_000_000_000_000_000n,
      fees: [],
      timeInSec: 180,
    },
  ],
  {
    protocol: "forevermoney",
    decentralisationScore: 2,
    providerLogo: "forevermoney.svg",
    providerName: "ForeverMoney",
  }
)

const SENT_0: RunLeg = { at: "sent", hash: LEG0_HASH, input: 1_000_000_000n }
const LANDED_0: RunLeg = { at: "landed", hash: LEG0_HASH, amount: 999_999_500_000_000_000n }
const SENT_1: RunLeg = { at: "sent", hash: LEG1_HASH, input: 999_999_500_000_000_000n }

const run = (first: RunLeg, second: RunLeg, id = "run-1"): SwapRun => ({
  id,
  quote: QUOTE,
  slippage: 0.005,
  legs: [first, second],
})

const note = (fields: Partial<UnfinishedSwap> = {}): UnfinishedSwap => ({
  runId: "run-1",
  fromAddress: EVM_ADDRESS,
  fromTokenId: HUB_TAO,
  toTokenId: BASE_WTAO,
  ...fields,
})

describe("unfinishedSwapOf", () => {
  it("points at the second leg's token once the first leg landed", () => {
    expect(unfinishedSwapOf(run(LANDED_0, { at: "ready" }))).toEqual(note())
  })

  it("points at the second leg's token while the first leg is in flight", () => {
    expect(unfinishedSwapOf(run(SENT_0, { at: "queued" }))).toEqual(note())
  })

  it.each(["failed", "cancelled"] as const)(
    "points at the stopped leg's token when it %s",
    (stop) => {
      expect(
        unfinishedSwapOf(run({ at: "stopped", hash: LEG0_HASH, stop }, { at: "queued" }))
      ).toEqual(note({ fromAddress: SUB_ADDRESS, fromTokenId: SUB_TAO }))
      expect(unfinishedSwapOf(run(LANDED_0, { at: "stopped", hash: LEG1_HASH, stop }))).toEqual(
        note()
      )
    }
  )

  it("has no note when Talisman lost track of a stopped leg", () => {
    expect(
      unfinishedSwapOf(run({ at: "stopped", hash: LEG0_HASH, stop: "untracked" }, { at: "queued" }))
    ).toBeNull()
  })

  it("has no note once the last leg is sent", () => {
    expect(unfinishedSwapOf(run(LANDED_0, SENT_1))).toBeNull()
  })
})

describe("withRunNote", () => {
  it("keeps the latest note of an account in place of an older one", () => {
    const older = note({ runId: "run-0", fromTokenId: "1:evm-native" })
    const other = note({ runId: "run-2", fromAddress: RECIPIENT })
    const latest = note({ fromAddress: EVM_ADDRESS.toLowerCase() })

    expect(withRunNote([older, other], "run-1", latest)).toEqual([other, latest])
  })

  it("replaces the note of the same run", () => {
    const first = note({ fromAddress: SUB_ADDRESS, fromTokenId: SUB_TAO })

    expect(withRunNote([first], "run-1", note())).toEqual([note()])
  })

  it("clears a run's note when the run has none", () => {
    const other = note({ runId: "run-2", fromAddress: RECIPIENT })

    expect(withRunNote([note(), other], "run-1", null)).toEqual([other])
  })
})

describe("withoutHeldFunds", () => {
  it("clears the notes of the account and token a new swap spends", () => {
    const otherToken = note({ runId: "run-2", fromTokenId: "1:evm-native" })
    const otherAccount = note({ runId: "run-3", fromAddress: RECIPIENT })

    expect(
      withoutHeldFunds([note(), otherToken, otherAccount], {
        fromAddress: EVM_ADDRESS.toLowerCase(),
        fromTokenId: HUB_TAO,
      })
    ).toEqual([otherToken, otherAccount])
  })
})

describe("saveUnfinishedSwap", () => {
  beforeEach(() => appStore.set({ unfinishedSwaps: [] }))

  it("stores the note while the run is unfinished and removes it once the last leg is sent", async () => {
    await saveUnfinishedSwap(run(SENT_0, { at: "queued" }))
    expect(await appStore.get("unfinishedSwaps")).toEqual([note()])

    await saveUnfinishedSwap(run(LANDED_0, SENT_1))
    expect(await appStore.get("unfinishedSwaps")).toEqual([])
  })
})
