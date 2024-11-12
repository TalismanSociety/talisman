import { useSuspenseQuery } from "@tanstack/react-query"
import { PolkadotCalls } from "papi-descriptors"
import { Binary } from "polkadot-api"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { cleanupNomPoolName } from "@ui/domains/Staking/helpers"
import { useChain } from "@ui/state"
import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { SummaryContainer } from "../shared/SummaryContainer"
import { SummaryComponentDefs } from "../shared/types"

export const SubSignCallSummaryNomPoolJoin: FC<{
  decodedCall: DecodedCall<PolkadotCalls["NominationPools"]["join"]>
  sapi: ScaleApi
}> = ({ decodedCall, sapi }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const { data: poolName } = useNomPoolName(sapi, decodedCall.args.pool_id)

  if (!chain?.nativeToken?.id) return null

  return (
    <SummaryContainer>
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
    </SummaryContainer>
  )
}

// do not reuse staking module's useNomPoolName, we need suspense
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

export const SummaryComponentsNominationPools: SummaryComponentDefs = [
  ["NominationPools", "join", SubSignCallSummaryNomPoolJoin],
]
