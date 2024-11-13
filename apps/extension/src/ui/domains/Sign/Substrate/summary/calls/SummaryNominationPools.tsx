import { useSuspenseQuery } from "@tanstack/react-query"
import { PolkadotCalls } from "papi-descriptors"
import { Binary } from "polkadot-api"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { cleanupNomPoolName } from "@ui/domains/Staking/helpers"
import { useChain } from "@ui/state"
import { ScaleApi } from "@ui/util/scaleApi"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { SummaryTokenSymbolDisplay } from "../shared/SummaryTokenSymbolDisplay"

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

const BondExtra: DecodedCallComponent<PolkadotCalls["NominationPools"]["bond_extra"]> = ({
  decodedCall,
  sapi,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (decodedCall.args.extra.type === "Rewards") return t("Restake your staking rewards")

  return (
    <Trans
      t={t}
      components={{
        Tokens: (
          <TokensAndFiat
            tokenId={chain?.nativeToken?.id}
            planck={decodedCall.args.extra.value}
            noCountUp
            className="font-bold"
            tokensClassName="text-body"
            fiatClassName="text-body-secondary"
          />
        ),
      }}
      defaults="Stake <Tokens /> in current nomination pool"
    />
  )
}

const ClaimPayout: DecodedCallComponent<PolkadotCalls["NominationPools"]["claim_payout"]> = () => {
  const { t } = useTranslation()

  return t("Claim your staking rewards")
}

const SetClaimPermission: DecodedCallComponent<
  PolkadotCalls["NominationPools"]["set_claim_permission"]
> = ({ decodedCall, inline }) => {
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

  return (
    <>
      <Trans
        t={t}
        components={{
          ClaimPermission: (
            <span className="font-bold text-white">{decodedCall.args.permission.type}</span>
          ),
        }}
        defaults="Set claim permission to <ClaimPermission />"
      />
      {!inline && <div className="mt-4 text-left">{description}</div>}
    </>
  )
}

const WithdrawUnbonded: DecodedCallComponent<
  PolkadotCalls["NominationPools"]["withdraw_unbonded"]
> = ({ sapi }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  return (
    <span>
      <Trans
        t={t}
        components={{
          Token: <SummaryTokenSymbolDisplay tokenId={chain.nativeToken.id} />,
        }}
        defaults="Withdraw unbonded <Token /> from nomination pool lalala"
      />
    </span>
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
  ["NominationPools", "set_claim_permission", SetClaimPermission],
  ["NominationPools", "withdraw_unbonded", WithdrawUnbonded],
  ["NominationPools", "bond_extra", BondExtra],
  ["NominationPools", "claim_payout", ClaimPayout],
]
