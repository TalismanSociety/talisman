import { PolkadotCalls } from "@polkadot-api/descriptors"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Binary } from "polkadot-api"
import { FC, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { cleanupNomPoolName } from "@ui/domains/Staking/helpers"
import { useChain } from "@ui/state"
import { ScaleApi } from "@ui/util/scaleApi"

import { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
import { SummaryContainer, SummaryContent, SummarySeparator } from "../shared/SummaryContainer"
import { SummaryLineBreak } from "../shared/SummaryLineBreak"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"
import { SummaryTokenSymbolDisplay } from "../shared/SummaryTokenSymbolDisplay"

const Join: DecodedCallSummaryComponent<PolkadotCalls["NominationPools"]["join"]> = ({
  decodedCall,
  sapi,
  mode,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Pool: <NomPoolName sapi={sapi} poolId={decodedCall.args.pool_id} />,
          LineBreak: <SummaryLineBreak mode={mode} />,
          Tokens: (
            <SummaryTokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.amount}
              mode={mode}
            />
          ),
        }}
        defaults="Stake <Tokens /><LineBreak /> in <Pool />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Pool: <NomPoolName sapi={sapi} poolId={decodedCall.args.pool_id} />,
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={chain?.nativeToken?.id}
                planck={decodedCall.args.amount}
                mode={mode}
              />
            ),
          }}
          defaults="Stake <Tokens /><br /> in nomination pool <Pool />"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const BondExtra: DecodedCallSummaryComponent<PolkadotCalls["NominationPools"]["bond_extra"]> = ({
  decodedCall,
  sapi,
  mode,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (mode !== "block" && decodedCall.args.extra.type === "Rewards")
    return (
      <Trans
        t={t}
        components={{
          Tokens: <SummaryTokenSymbolDisplay tokenId={chain?.nativeToken?.id} />,
        }}
        defaults="Restake your <Tokens /> rewards"
      />
    )

  if (mode !== "block" && decodedCall.args.extra.type === "FreeBalance")
    return (
      <Trans
        t={t}
        components={{
          Tokens: (
            <SummaryTokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.extra.value}
              mode={mode}
            />
          ),
        }}
        defaults="Add <Tokens /> to your stake"
      />
    )

  if (decodedCall.args.extra.type === "Rewards")
    return (
      <SummaryContainer>
        <SummaryContent>
          <Trans
            t={t}
            components={{
              Tokens: <SummaryTokenSymbolDisplay tokenId={chain?.nativeToken?.id} />,
            }}
            defaults="Restake your <Tokens /> rewards in current nomination pool"
          />
        </SummaryContent>
      </SummaryContainer>
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={chain?.nativeToken?.id}
                planck={decodedCall.args.extra.value}
                mode={mode}
              />
            ),
          }}
          defaults="Add <Tokens /> to your stake with current nomination pool"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const ClaimPayout: DecodedCallSummaryComponent<
  PolkadotCalls["NominationPools"]["claim_payout"]
> = ({ mode }) => {
  const { t } = useTranslation()

  if (mode !== "block") return t("Claim your staking rewards")

  return (
    <SummaryContainer>
      <SummaryContent>{t("Claim your staking rewards")}</SummaryContent>
    </SummaryContainer>
  )
}

const SetClaimPermission: DecodedCallSummaryComponent<
  PolkadotCalls["NominationPools"]["set_claim_permission"]
> = ({ decodedCall, mode }) => {
  const { t } = useTranslation()

  const description = useMemo(() => {
    switch (decodedCall.args.permission.type) {
      case "Permissioned":
        return t("This prevents your rewards from being claimed by anyone else.")
      case "PermissionlessAll":
        return t("This allows other accounts to claim or compound staking rewards on your behalf.")
      case "PermissionlessCompound":
        return t("This allows other accounts to compound rewards on your behalf.")
      case "PermissionlessWithdraw":
        return t("This allows other accounts to claim rewards on your behalf.")
      default:
        throw new Error("Unsupported permission type")
    }
  }, [decodedCall.args.permission.type, t])

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          ClaimPermission: <span className="text-white">{decodedCall.args.permission.type}</span>,
        }}
        defaults="Set claim permission to <ClaimPermission />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            ClaimPermission: <span className="text-white">{decodedCall.args.permission.type}</span>,
          }}
          defaults="Set claim permission to <ClaimPermission />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryContent>{description}</SummaryContent>
    </SummaryContainer>
  )
}

const WithdrawUnbonded: DecodedCallSummaryComponent<
  PolkadotCalls["NominationPools"]["withdraw_unbonded"]
> = ({ sapi, mode }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Token: <SummaryTokenSymbolDisplay tokenId={chain.nativeToken.id} />,
        }}
        defaults="Withdraw unbonded <Token />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Token: <SummaryTokenSymbolDisplay tokenId={chain.nativeToken.id} />,
          }}
          defaults="Withdraw unbonded <Token /> from nomination pool"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const NomPoolName: FC<{ sapi: ScaleApi; poolId: number }> = ({ sapi, poolId }) => {
  const { data: poolName } = useNomPoolName(sapi, poolId)

  return <span className="text-body inline-block">{poolName ?? `Pool ${poolId}`}</span>
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

export const SUMMARY_COMPONENTS_NOMINATION_POOLS: DecodedCallSummaryComponentDefs = [
  ["NominationPools", "join", Join],
  ["NominationPools", "set_claim_permission", SetClaimPermission],
  ["NominationPools", "withdraw_unbonded", WithdrawUnbonded],
  ["NominationPools", "bond_extra", BondExtra],
  ["NominationPools", "claim_payout", ClaimPayout],
]
