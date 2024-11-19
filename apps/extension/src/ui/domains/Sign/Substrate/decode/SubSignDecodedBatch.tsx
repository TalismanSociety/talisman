import { useMemo } from "react"

import { DecodedCall } from "@ui/util/scaleApi"

import { DecodedBatchArgs, DecodedBatchCall, DecodedCallComponent } from "../types"
import { SubSignDecodedBatchDrawer } from "./SubSignDecodedBatchDrawer"
import {
  SubSignDecodedBatchDrawerProvider,
  useSubSignDecodedBatchDrawer,
} from "./SubSignDecodedBatchDrawerContext"
import { SubSignDecodedButtonBase } from "./SubSignDecodedCallButton"

export const SubSignDecodedBatch: DecodedCallComponent<DecodedBatchArgs> = ({
  sapi,
  decodedCall,
  payload,
}) => {
  const childCalls = useMemo<DecodedCall[]>(() => {
    return decodedCall.args.calls.map((call) => ({
      pallet: call.type,
      method: call.value.type,
      args: call.value.value,
    }))
  }, [decodedCall.args.calls])

  return (
    <SubSignDecodedBatchDrawerProvider decodedCall={decodedCall as DecodedBatchCall}>
      {childCalls.map((call, index) => (
        <BatchCallItemButton
          key={index}
          index={index}
          decodedCall={call}
          sapi={sapi}
          payload={payload}
        />
      ))}
      <SubSignDecodedBatchDrawer sapi={sapi} payload={payload} />
    </SubSignDecodedBatchDrawerProvider>
  )
}

const BatchCallItemButton: DecodedCallComponent<unknown, { index: number }> = ({
  index,
  decodedCall,
  sapi,
  payload,
}) => {
  const { open } = useSubSignDecodedBatchDrawer()

  return (
    <SubSignDecodedButtonBase
      sapi={sapi}
      decodedCall={decodedCall}
      payload={payload}
      mode="compact"
      onClick={() => open(index)}
    />
  )
}
