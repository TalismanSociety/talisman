import { useMemo } from "react"

import { DecodedCall } from "@ui/util/scaleApi"

import { DecodedCallComponentDefs } from "../types"

export const useDecodedCallComponent = <T, P>(
  decodedCall: DecodedCall | null | undefined,
  componentDefs: DecodedCallComponentDefs<T, P>,
) => {
  return useMemo(() => {
    if (!decodedCall) return null
    return (
      componentDefs.find(
        ([pallet, call]) => pallet === decodedCall.pallet && call === decodedCall.method,
      )?.[2] ?? null
    )
  }, [decodedCall, componentDefs])
}
