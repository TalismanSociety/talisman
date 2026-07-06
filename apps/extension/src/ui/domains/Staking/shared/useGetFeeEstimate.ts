import type { SignerPayloadJSON } from "@core/types/pjsInterop"
import type { ScaleApi } from "@talismn/sapi"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

type GetNomPoolFeeEstimate = {
  sapi: ScaleApi | undefined | null
  payload: SignerPayloadJSON | undefined
}

export const useGetFeeEstimate = ({ sapi, payload }: GetNomPoolFeeEstimate) => {
  return useQuery({
    queryKey: ["feeEstimate", sapi?.id, payload],
    queryFn: () => {
      if (!sapi || !payload) return null
      return sapi.getFeeEstimate(payload)
    },
    enabled: !!sapi && !!payload,
    placeholderData: keepPreviousData,
  })
}
