import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { PolkadotCalls } from "@polkadot-api/descriptors"
import type { DecodedCall, ScaleApi } from "@talismn/sapi"
import type { FC } from "react"

export type DecodedBatchCall =
  | {
      pallet: "Utility"
      method: "batch"
      args: PolkadotCalls["Utility"]["batch"]
    }
  | {
      pallet: "Utility"
      method: "batch_all"
      args: PolkadotCalls["Utility"]["batch_all"]
    }
  | {
      pallet: "Utility"
      method: "force_batch"
      args: PolkadotCalls["Utility"]["force_batch"]
    }

export type DecodedBatchArgs = DecodedBatchCall["args"]

export const isBatchCall = (
  decodedCall: DecodedCall | null | undefined
): decodedCall is DecodedBatchCall => {
  return (
    decodedCall?.pallet === "Utility" &&
    ["batch", "batch_all", "force_batch"].includes(decodedCall.method)
  )
}

/**
 * Decoded call display mode
 * - block: display as a block element (includes the container)
 * - multiline: display as a multiline text, meant for big buttons (no container)
 * - compact: display as a compact text, meant one liner buttons (no container)
 */
export type SummaryDisplayMode = "block" | "multiline" | "compact"
export type SummaryButtonDisplayMode = "multiline" | "compact"

export type DecodedCallComponent<Args, Props = object> = FC<
  {
    decodedCall: DecodedCall<Args>
    sapi: ScaleApi
    payload: SignerPayloadJSON
  } & Props
>

// biome-ignore lint/suspicious/noExplicitAny: legacy
export type DecodedCallComponentDef<T = any, P = object> = [
  string,
  string,
  DecodedCallComponent<T, P>,
]

// biome-ignore lint/suspicious/noExplicitAny: legacy
export type DecodedCallComponentDefs<T = any, P = unknown> = DecodedCallComponentDef<T, P>[]

export type DecodedCallSummaryComponent<T> = DecodedCallComponent<T, { mode: SummaryDisplayMode }>

// biome-ignore lint/suspicious/noExplicitAny: legacy
export type DecodedCallSummaryComponentDef<T = any> = [
  string,
  string,
  DecodedCallSummaryComponent<T>,
]
export type DecodedCallSummaryComponentDefs = DecodedCallSummaryComponentDef[]
