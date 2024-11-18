import { SignerPayloadJSON } from "extension-core"
import { FC, useMemo } from "react"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { DecodedBatchCall } from "../types"
import { SubSignDecodedBatchModal } from "./SubSignDecodedBatchModal"
import {
  SubSignDecodedBatchModalProvider,
  useSubSignDecodedBatchModal,
} from "./SubSignDecodedBatchModalContext"
import { SubSignDecodedButtonBase } from "./SubSignDecodedCallButton"

export const SubSignDecodedBatch: FC<{
  sapi: ScaleApi
  decodedCall: DecodedBatchCall
  payload: SignerPayloadJSON
}> = ({ sapi, decodedCall, payload }) => {
  const childCalls = useMemo<DecodedCall[]>(() => {
    return decodedCall.args.calls.map((call) => ({
      pallet: call.type,
      method: call.value.type,
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
    <SubSignDecodedButtonBase
      sapi={sapi}
      decodedCall={decodedCall}
      payload={payload}
      onClick={() => open(index)}
    />
  )
}
