import { SignerPayloadJSON } from "@polkadot/types/types"
import { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

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
