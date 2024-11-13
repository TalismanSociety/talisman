import { SignerPayloadJSON } from "extension-core"
import { FC, useMemo } from "react"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { DecodedBatchCall } from "../types"
import { SubSignDecodeButtonContent } from "./SubSignDecodeButtonContent"
import { SubSignDecodedBatchModal } from "./SubSignDecodedBatchModal"
import {
  SubSignDecodedBatchModalProvider,
  useSubSignDecodedBatchModal,
} from "./SubSignDecodedBatchModalContext"

export const SubSignDecodedBatch: FC<{
  sapi: ScaleApi
  decodedCall: DecodedBatchCall
  payload: SignerPayloadJSON
}> = ({ sapi, decodedCall, payload }) => {
  const childCalls = useMemo<DecodedCall[]>(() => {
    return decodedCall.args.calls.map((call) => ({
      pallet: call.type,
      call: call.value.type,
      args: call.value.value,
    }))
  }, [decodedCall.args.calls])

  return (
    <SubSignDecodedBatchModalProvider decodedCall={decodedCall}>
      {childCalls.map((call, index) => (
        <BatchCallItemButton
          key={index}
          index={index}
          decodedCall={call}
          sapi={sapi}
          payload={payload}
        />
      ))}
      <SubSignDecodedBatchModal sapi={sapi} payload={payload} />
    </SubSignDecodedBatchModalProvider>
  )
}

const BatchCallItemButton: FC<{
  index: number
  sapi: ScaleApi
  decodedCall: DecodedCall
  payload: SignerPayloadJSON
}> = ({ index, decodedCall, sapi, payload }) => {
  const { open } = useSubSignDecodedBatchModal()

  return (
    <button
      type="button"
      className="bg-grey-900 hover:bg-grey-800 text-body-secondary rounded-xs left-align flex gap-4 truncate p-4 text-left"
      onClick={() => open(index)}
    >
      <div className="text-body-inactive inine-block shrink-0 tabular-nums">{index + 1}.</div>
      <div className="grow truncate">
        <SubSignDecodeButtonContent sapi={sapi} decodedCall={decodedCall} payload={payload} />
      </div>
    </button>
  )
}
