import {
  EVM_ADDRESS,
  LEG0,
  LEG0_HASH,
  LEG1,
  PLAN_ID,
  SUB_ADDRESS,
  SUMMARY,
  T0,
} from "@core/domains/swaps/plans/__tests__/fixtures"
import type { LegState, SwapPlan } from "@core/domains/swaps/plans/types"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import type { Network } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { describe, expect, it } from "vitest"

import {
  quoteRouteSummary,
  quoteStepRows,
  type StepRowContext,
  swapPlanFooterAction,
  swapPlanProgressView,
} from "./swapPlanStepRows"

const t = (key: string, options?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name]))

const network = (fields: Pick<Network, "id" | "name" | "blockExplorerUrls">) => fields as Network

const LEG1_HASH = `0x${"22".repeat(32)}` as const

const ctx = (intermediateType: "keypair" | "ledger-ethereum" = "keypair"): StepRowContext => ({
  t,
  accounts: {
    [normalizeAddress(SUB_ADDRESS)]: { name: "Main", type: "keypair" },
    [normalizeAddress(EVM_ADDRESS)]: { name: "Bridge account", type: intermediateType },
  },
  networks: {
    "bittensor": network({
      id: "bittensor",
      name: "Bittensor",
      blockExplorerUrls: ["https://taostats.io/"],
    }),
    "964": network({
      id: "964",
      name: "Bittensor EVM",
      blockExplorerUrls: ["https://evm.taostats.io/"],
    }),
    "8453": network({ id: "8453", name: "Base", blockExplorerUrls: ["https://basescan.org/"] }),
  },
})

const LANDED_0: LegState = { at: "landed", hash: LEG0_HASH, amount: "1", landedAt: T0 }
const LANDED_1: LegState = { at: "landed", hash: LEG1_HASH, amount: "1", landedAt: T0 }

const plan = (phase: SwapPlan["phase"], first: LegState, second: LegState): SwapPlan => ({
  id: PLAN_ID,
  phase,
  createdAt: T0,
  updatedAt: T0,
  signUntil: T0 + 1,
  summary: SUMMARY,
  intermediate: EVM_ADDRESS,
  legs: [
    { ...LEG0, state: first },
    { ...LEG1, state: second },
  ],
})

const ethRow = (
  hash: `0x${string}`,
  fields: Partial<WalletTransactionEth> = {}
): WalletTransactionEth => ({
  id: hash,
  hash,
  platform: "ethereum",
  networkId: "964",
  account: EVM_ADDRESS,
  status: "success",
  confirmed: true,
  payload: {},
  nonce: 1,
  timestamp: T0,
  ...fields,
})

const forevermoneyRow = (swapStatus: WalletTransactionEth["swapStatus"]) =>
  ethRow(LEG1_HASH, {
    blockNumber: "200",
    swapStatus,
    txInfo: {
      type: "swap-forevermoney",
      fromTokenId: LEG1.quote.fromTokenId,
      toTokenId: LEG1.quote.toTokenId,
      fromAmount: "1",
      toAmount: "1",
      to: EVM_ADDRESS,
      destinationStartBlock: "1",
    },
  })

const rows = (...list: WalletTransactionEth[]) => new Map(list.map((row) => [row.id, row]))

const view = (
  value: SwapPlan,
  options: { rows?: Map<string, WalletTransactionEth>; ledgerError?: string; ledger?: boolean } = {}
) =>
  swapPlanProgressView(ctx(options.ledger ? "ledger-ethereum" : "keypair"), {
    plan: value,
    rows: options.rows ?? new Map(),
    ledgerError: options.ledgerError ?? null,
  })

const statusAndDetail = (value: ReturnType<typeof view>) =>
  value.steps.map(({ label, status, detail }) => ({ label, status, detail }))

describe("swapPlanProgressView", () => {
  it("shows the first leg sending and the next one sent automatically", () => {
    const result = view(
      plan(
        "running",
        {
          at: "sent",
          hash: LEG0_HASH,
          sentAt: T0,
          deadlineAt: T0 + 1,
          evidence: { platform: "ethereum" },
        },
        { at: "queued" }
      )
    )

    expect(result).toMatchObject({ title: "Swap in progress", animStatus: "processing" })
    expect(statusAndDetail(result)).toEqual([
      { label: "Move to EVM", status: "in-progress", detail: "Sending from Main" },
      {
        label: "Bridge to Base",
        status: "upcoming",
        detail: "Sent automatically from Bridge account",
      },
    ])
    expect(result.steps[0].href).toContain(LEG0_HASH)
    expect(result.steps[1].href).toBeUndefined()
  })

  it("says an upcoming leg of a Ledger account is signed on the Ledger", () => {
    const result = view(plan("running", LANDED_0, { at: "queued" }), { ledger: true })
    expect(result.steps[1].detail).toBe("Signed on your Ledger from Bridge account")
  })

  it("shows the block the first leg landed in while the second is sent", () => {
    const result = view(
      plan("running", LANDED_0, {
        at: "sent",
        hash: LEG1_HASH,
        sentAt: T0,
        deadlineAt: T0 + 1,
        evidence: { platform: "ethereum" },
      }),
      { rows: rows(ethRow(LEG0_HASH, { blockNumber: "123" })) }
    )

    expect(statusAndDetail(result)).toEqual([
      { label: "Move to EVM", status: "done", detail: "Included in block #123" },
      { label: "Bridge to Base", status: "in-progress", detail: "Sending from Bridge account" },
    ])
  })

  it("links a landed leg without a known block to the block explorer", () => {
    const result = view(plan("running", LANDED_0, { at: "building", attempt: 1, nextAttemptAt: 0 }))
    expect(statusAndDetail(result)).toEqual([
      { label: "Move to EVM", status: "done", detail: "View on block explorer" },
      { label: "Bridge to Base", status: "in-progress", detail: "Preparing" },
    ])
  })

  it("keeps the swap in progress until the last leg's funds arrive", () => {
    const result = view(plan("completed", LANDED_0, LANDED_1), {
      rows: rows(forevermoneyRow("sending")),
    })

    expect(result).toMatchObject({ title: "Swap in progress", animStatus: "processing" })
    expect(result.steps[1]).toMatchObject({ status: "in-progress", detail: "Arriving on Base" })
  })

  it("completes the swap once the last leg's funds arrived", () => {
    const result = view(plan("completed", LANDED_0, LANDED_1), {
      rows: rows(forevermoneyRow("finished")),
    })

    expect(result).toMatchObject({
      title: "Swap complete",
      subtitle: "Your swap was successful!",
      animStatus: "success",
    })
    expect(result.steps.map((step) => step.status)).toEqual(["done", "done"])
    expect(result.steps[1].detail).toBe("Arrived on Base")
  })

  it("fails the last step when its delivery failed", () => {
    const result = view(plan("completed", LANDED_0, LANDED_1), {
      rows: rows(forevermoneyRow("failed")),
    })

    expect(result).toMatchObject({ title: "Bridge failed", animStatus: "failure" })
    expect(result.steps[1]).toMatchObject({
      status: "failed",
      detail: "Did not complete. Check your activity",
    })
  })

  it("asks for the unlock a paused plan waits on", () => {
    const result = view(plan("paused", LANDED_0, { at: "awaiting-user", why: "unlock", since: T0 }))

    expect(result).toMatchObject({
      title: "Unlock to continue",
      subtitle: "Step 2 is sent once Talisman is unlocked.",
    })
    expect(result.steps[1]).toMatchObject({
      status: "waiting-on-you",
      detail: "Waiting for you to unlock Talisman",
    })
  })

  it("asks for the Ledger signature a hardware leg waits on", () => {
    const result = view(
      plan("paused", LANDED_0, { at: "awaiting-user", why: "hardware", since: T0 })
    )

    expect(result.title).toBe("Sign step 2 on your Ledger")
    expect(result.steps[1].detail).toBe("Waiting for your Ledger signature")
  })

  it("tells why the Ledger transaction could not be prepared", () => {
    const result = view(
      plan("paused", LANDED_0, { at: "awaiting-user", why: "hardware", since: T0 }),
      { ledgerError: "This swap provider is unavailable" }
    )

    expect(result.steps[1]).toMatchObject({
      status: "waiting-on-you",
      detail: "This swap provider is unavailable",
    })
  })

  it("says where the funds wait when the stopping leg sent nothing", () => {
    const result = view(
      plan("stopped", LANDED_0, { at: "failed", failure: "provider-unavailable", failedAt: T0 })
    )

    expect(result).toMatchObject({
      title: "Swap stopped after step 1",
      subtitle: "Your funds wait on your account at the end of step 1.",
      animStatus: "failure",
    })
    expect(result.steps[1]).toMatchObject({
      status: "failed",
      detail: "Not sent. Your funds wait on Bridge account",
    })
  })

  it("points to the activity when the stopping leg sent a transaction", () => {
    const result = view(
      plan("stopped", LANDED_0, {
        at: "failed",
        failure: "indeterminate",
        hash: LEG1_HASH,
        failedAt: T0,
      })
    )

    expect(result.subtitle).toBe("Step 2 did not complete. Check your activity for its status.")
    expect(result.steps[1]).toMatchObject({
      status: "failed",
      detail: "Did not complete. Check your activity",
    })
  })

  it("cancels the swap when the first leg did not go through", () => {
    const result = view(
      plan("aborted", { at: "failed", failure: "expired", failedAt: T0 }, { at: "skipped" })
    )

    expect(result).toMatchObject({ title: "Swap cancelled", animStatus: "failure" })
    expect(statusAndDetail(result)).toEqual([
      { label: "Move to EVM", status: "failed", detail: "Not sent. Your funds wait on Main" },
      { label: "Bridge to Base", status: "skipped", detail: "Skipped" },
    ])
  })
})

describe("swapPlanFooterAction", () => {
  it("tracks the last leg while its funds travel", () => {
    expect(
      swapPlanFooterAction({
        plan: plan("completed", LANDED_0, LANDED_1),
        rows: rows(forevermoneyRow("sending")),
      })
    ).toEqual({ type: "track", url: expect.stringContaining(LEG1_HASH) })
  })

  it("offers nothing while a running plan has no trackable leg", () => {
    expect(
      swapPlanFooterAction({ plan: plan("running", LANDED_0, { at: "queued" }), rows: new Map() })
    ).toEqual({ type: "none" })
  })

  it("asks to unlock a plan paused on the unlock", () => {
    expect(
      swapPlanFooterAction({
        plan: plan("paused", LANDED_0, { at: "awaiting-user", why: "unlock", since: T0 }),
        rows: new Map(),
      })
    ).toEqual({ type: "unlock" })
  })
})

describe("quoteStepRows", () => {
  const legs = [LEG0.quote, LEG1.quote]

  it("has the user sign the first step and the intermediate account send the next", () => {
    expect(quoteStepRows(ctx(), legs)).toEqual([
      {
        key: "0",
        label: "Move to EVM",
        status: "waiting-on-you",
        detail: "You sign this step from Main",
      },
      {
        key: "1",
        label: "Bridge to Base",
        status: "upcoming",
        detail: "Sent automatically from Bridge account",
      },
    ])
  })

  it("labels a leg that stays on its network as a swap", () => {
    const [row] = quoteStepRows(ctx(), [{ ...LEG1.quote, toTokenId: "964:evm-native" }])
    expect(row.label).toBe("Swap")
  })

  it("names the step count and the intermediate account", () => {
    expect(quoteRouteSummary(ctx(), legs)).toBe("2 steps, via Bridge account")
  })

  it("falls back to the shortened address of an unknown intermediate", () => {
    expect(quoteRouteSummary({ ...ctx(), accounts: {} }, legs)).toBe("2 steps, via 0x19…ff2A")
  })
})
