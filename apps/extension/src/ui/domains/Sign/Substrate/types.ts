import { SignerPayloadJSON } from "extension-core"
import { PolkadotCalls } from "papi-descriptors"
import { FC } from "react"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

export type DecodedBatchCall =
  | {
      pallet: "Utility"
      call: "batch"
      args: PolkadotCalls["Utility"]["batch"]
    }
  | {
      pallet: "Utility"
      call: "batch_all"
      args: PolkadotCalls["Utility"]["batch_all"]
    }
  | {
      pallet: "Utility"
      call: "force_batch"
      args: PolkadotCalls["Utility"]["force_batch"]
    }

export type DecodedBatchArgs = DecodedBatchCall["args"]

export const isBatchCall = (decodedCall: DecodedCall): decodedCall is DecodedBatchCall => {
  return (
    decodedCall.pallet === "Utility" &&
    ["batch", "batch_all", "force_batch"].includes(decodedCall.call)
  )
}

export type DecodedCallComponent<Args> = FC<{
  decodedCall: DecodedCall<Args>
  sapi: ScaleApi
  payload: SignerPayloadJSON
  inline?: boolean
}>

export type DecodedCallComponentDef<T> = [string, string, DecodedCallComponent<T>]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedCallComponentDefs = DecodedCallComponentDef<any>[]
