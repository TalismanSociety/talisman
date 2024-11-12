import { useMemo } from "react"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../types"
import { SUMMARY_COMPONENTS_BALANCES } from "./calls/SummaryBalances"
import { SUMMARY_COMPONENTS_CONVICTION_VOTING } from "./calls/SummaryConvictionVoting"
import { SUMMARY_COMPONENTS_NOMINATION_POOLS } from "./calls/SummaryNominationPools"

const SupportedCalls: DecodedCallComponentDefs = [
  ...SUMMARY_COMPONENTS_CONVICTION_VOTING,
  ...SUMMARY_COMPONENTS_NOMINATION_POOLS,
  ...SUMMARY_COMPONENTS_BALANCES,
]

export const SubSignCallSummary: DecodedCallComponent<unknown> = ({
  decodedCall,
  sapi,
  payload,
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

  return <Component decodedCall={decodedCall} sapi={sapi} payload={payload} />
}
