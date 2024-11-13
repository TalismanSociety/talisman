import { useSuspenseQuery } from "@tanstack/react-query"
import { PolkadotCalls } from "papi-descriptors"
import { Binary } from "polkadot-api"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { cleanupNomPoolName } from "@ui/domains/Staking/helpers"
import { useChain } from "@ui/state"
import { ScaleApi } from "@ui/util/scaleApi"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"

const Join: DecodedCallComponent<PolkadotCalls["NominationPools"]["join"]> = ({
  decodedCall,
  sapi,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const { data: poolName } = useNomPoolName(sapi, decodedCall.args.pool_id)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  return (
    <Trans
      t={t}
      components={{
        Pool: <span className="text-body inline-block font-bold">{poolName}</span>,
        Tokens: (
          <TokensAndFiat
            tokenId={chain?.nativeToken?.id}
            planck={decodedCall.args.amount}
            noCountUp
            className="font-bold"
            tokensClassName="text-body"
            fiatClassName="text-body-secondary"
          />
        ),
      }}
      defaults="Stake <Tokens /> in nomination pool <Pool />"
    />
  )
}

// do not reuse staking module's useNomPoolName, we need suspense here
const useNomPoolName = (sapi: ScaleApi | null | undefined, poolId: number | null | undefined) => {
  return useSuspenseQuery({
    queryKey: ["useNomPoolName", sapi?.id, poolId],
    queryFn: async () => {
      if (!sapi) return null

      const metadata = await sapi.getStorage<Binary>("NominationPools", "Metadata", [poolId])

      return cleanupNomPoolName(metadata?.asText())
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}

export const SUMMARY_COMPONENTS_NOMINATION_POOLS: DecodedCallComponentDefs = [
  ["NominationPools", "join", Join],
]
