import { FC, useMemo } from "react"

import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { SummaryComponentsBalances } from "./calls/SummaryBalances"
import { SummaryComponentsConvictionVoting } from "./calls/SummaryConvictionVoting"
import { SummaryComponentsNominationPools } from "./calls/SummaryNominationPools"
import { SummaryComponentDefs } from "./shared/types"

const SupportedCalls: SummaryComponentDefs = [
  ...SummaryComponentsConvictionVoting,
  ...SummaryComponentsNominationPools,
  ...SummaryComponentsBalances,
]

export const SubSignCallSummary: FC<{ decodedCall: DecodedCall; sapi: ScaleApi }> = ({
  decodedCall,
  sapi,
}) => {
  const Component = useMemo(() => {
    if (!decodedCall) return null
    return (
      SupportedCalls.find(
        ([pallet, call]) => pallet === decodedCall.pallet && call === decodedCall.call,
      )?.[2] ?? null
    )
  }, [decodedCall])

  if (!Component || !decodedCall) return null

  return <Component decodedCall={decodedCall} sapi={sapi} />
}
