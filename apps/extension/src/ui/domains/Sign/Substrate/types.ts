import { PolkadotCalls } from "@polkadot-api/descriptors"
import { SignerPayloadJSON } from "extension-core"
import { FC } from "react"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

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
  decodedCall: DecodedCall | null | undefined,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedCallComponentDef<T = any, P = object> = [
  string,
  string,
  DecodedCallComponent<T, P>,
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedCallComponentDefs<T = any, P = unknown> = DecodedCallComponentDef<T, P>[]

export type DecodedCallSummaryComponent<T> = DecodedCallComponent<T, { mode: SummaryDisplayMode }>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedCallSummaryComponentDef<T = any> = [
  string,
  string,
  DecodedCallSummaryComponent<T>,
]
export type DecodedCallSummaryComponentDefs = DecodedCallSummaryComponentDef[]
