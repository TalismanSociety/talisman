import { sessionStorage } from "@core/util/sessionStorageCompat"
import { bytesToHex } from "viem"

import type { SwapPlan, SwapPlanId } from "./types"

type Sealed = Pick<SwapPlan, "id" | "legs" | "summary">

const sortedKeys = (_key: string, value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : value

/** everything a later leg is built and admitted from: its quote, signer and bound, and the slippage */
const digest = async ({ legs, summary }: Sealed) => {
  const content = JSON.stringify(
    {
      legs: legs.map(({ quote, signerType, bound }) => ({ quote, signerType, bound })),
      slippage: summary.slippage,
    },
    sortedKeys
  )
  return bytesToHex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)))
  )
}

const sealKey = (id: SwapPlanId) => `swapPlanSeal:${id}` as const

/**
 * Session storage never reaches the disk and empties when the browser closes. The background signs
 * a leg on its own only for a plan this browser session proposed: a plan that anything else wrote
 * into the database, or changed there, waits for the user
 */
export const sealPlan = async (plan: Sealed) =>
  sessionStorage.set({ [sealKey(plan.id)]: await digest(plan) })

export const isPlanSealed = async (plan: Sealed) =>
  (await sessionStorage.get(sealKey(plan.id))) === (await digest(plan))
