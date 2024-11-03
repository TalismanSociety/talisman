import { SignerPayloadJSON } from "@polkadot/types/types"
import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

type GetNomPoolFeeEstimate = {
  sapi: ScaleApi | undefined | null
  payload: SignerPayloadJSON | undefined
}

export const useGetFeeEstimate = ({ sapi, payload }: GetNomPoolFeeEstimate) => {
  return useQuery({
    queryKey: ["feeEstimate", sapi?.id, payload], // safe stringify because contains bigint
    queryFn: () => {
      if (!sapi || !payload) return null
      return sapi.getFeeEstimate(payload)
    },
    enabled: !!sapi && !!payload,
  })
}
