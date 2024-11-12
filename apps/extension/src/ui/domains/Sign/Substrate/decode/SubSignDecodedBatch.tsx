import { FC, useMemo } from "react"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { SubSignDecodedBatchModal } from "./SubSignDecodedBatchModal"
import {
  SubSignDecodedBatchModalProvider,
  useSubSignDecodedBatchModal,
} from "./SubSignDecodedBatchModalContext"
import { SupportedCallBatch } from "./types"

export const SubSignDecodedBatch: FC<{ sapi: ScaleApi; decodedCall: SupportedCallBatch }> = ({
  sapi,
  decodedCall,
}) => {
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
        <BatchCallItemButton key={index} index={index} call={call} />
      ))}
      <SubSignDecodedBatchModal sapi={sapi} />
    </SubSignDecodedBatchModalProvider>
  )
}

const BatchCallItemButton: FC<{ index: number; call: DecodedCall }> = ({ index, call }) => {
  const { open } = useSubSignDecodedBatchModal()

  return (
    <button
      type="button"
      className="bg-grey-900 hover:bg-grey-800 text-body-secondary rounded-xs left-align flex gap-4 truncate p-4 text-left"
      onClick={() => open(index)}
    >
      <div className="text-body-inactive inine-block shrink-0 tabular-nums">{index + 1}.</div>
      <div className="grow truncate">
        {call.pallet} : {call.call}
      </div>
    </button>
  )
}
