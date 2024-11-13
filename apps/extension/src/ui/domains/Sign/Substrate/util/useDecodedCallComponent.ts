import { useMemo } from "react"

import { DecodedCall } from "@ui/util/scaleApi"

import { DecodedCallComponentDefs } from "../types"

export const useDecodedCallComponent = (
  decodedCall: DecodedCall | null | undefined,
  componentDefs: DecodedCallComponentDefs,
) => {
  return useMemo(() => {
    if (!decodedCall) return null
    return (
      componentDefs.find(
        ([pallet, call]) => pallet === decodedCall.pallet && call === decodedCall.call,
      )?.[2] ?? null
    )
  }, [decodedCall, componentDefs])
}
