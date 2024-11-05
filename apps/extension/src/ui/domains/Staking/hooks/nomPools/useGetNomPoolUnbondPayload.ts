import { Enum } from "@polkadot-api/substrate-bindings"
import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"

import { ScaleApi } from "@ui/util/scaleApi"

import { NomPoolMember } from "../../types"

type GetNomPoolUnbondPayload = {
  sapi: ScaleApi | undefined | null
  isEnabled: boolean
  address: string | undefined
  pool: NomPoolMember | null | undefined
}

export const useGetNomPoolUnbondPayload = ({ sapi, address, pool }: GetNomPoolUnbondPayload) => {
  return useQuery({
    queryKey: [
      "getExtrinsicPayload",
      "NominationPools.unbond",
      sapi?.id,
      address,
      papiStringify(pool),
    ],
    queryFn: async () => {
      if (!sapi || !address || !pool) return null

      return sapi.getExtrinsicPayload(
        "NominationPools",
        "unbond",
        {
          member_account: Enum("Id", address),
          unbonding_points: pool.points,
        },
        { address },
      )
    },
  })
}
