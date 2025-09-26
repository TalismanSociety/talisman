import { MessageScanResponse } from "@blockaid/client/resources/solana/message.mjs"
import { solNativeTokenId, SolNetworkId, solSplTokenId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useTokensMap } from "@ui/state"

import { RiskAnalysisAssetImage } from "../RiskAnalysisAssetImage"
import { RiskAnalysisResult } from "../useRiskAnalysisBase"

const getAccountStateChanges = (
  accountSummary: MessageScanResponse.Result.Simulation.AccountSummary,
) => {
  return (
    accountSummary.account_assets_diff?.map((diff) => {
      if (!diff.in && !diff.out) {
        log.warn("[getAccountStateChanges] assetDiff with no changes", { accountSummary, diff })
      }

      return { ...diff, side: diff.in ? "in" : "out" }
    }) ?? []
  )
}

type AccountStateChange = NonNullable<
  MessageScanResponse.Result.Simulation.AccountSummary["account_assets_diff"]
>[number]

const StateChangeImage: FC<{ change: AccountStateChange }> = ({ change }) => {
  switch (change.asset.type) {
    case "SOL":
      return (
        <RiskAnalysisAssetImage
          type="currency"
          imageUrl={change.asset.logo}
          name={"Solana"}
          side={change.in ? "in" : "out"}
        />
      )
    case "TOKEN":
      return (
        <RiskAnalysisAssetImage
          type="currency"
          imageUrl={change.asset.logo}
          name={change.asset.name ?? change.asset.symbol!}
          side={change.in ? "in" : "out"}
        />
      )
    case "ETH":
      return (
        <RiskAnalysisAssetImage
          type="currency"
          imageUrl={change.asset.logo}
          name={"Ethereum"}
          side={change.in ? "in" : "out"}
        />
      )
    case "NFT":
    case "CNFT":
    default:
      return (
        <RiskAnalysisAssetImage
          type="nft"
          imageUrl={change.asset.logo}
          name={change.asset.name ?? change.asset.symbol!}
          side={change.in ? "in" : "out"}
        />
      )
  }
}

const StateChangeDescription: FC<{ change: AccountStateChange; networkId: SolNetworkId }> = ({
  change,
  networkId,
}) => {
  const { t } = useTranslation()
  const action = useMemo(() => {
    if (change.in) return "Receive"
    if (change.out) return "Send"
    return null
  }, [change])

  const tokens = useTokensMap()
  const token = useMemo(() => {
    if (change.asset.type === "SOL") return tokens[solNativeTokenId(networkId)]
    if (change.asset.type === "TOKEN" && change.asset.address)
      return tokens[solSplTokenId(networkId, change.asset.address)]
    return null
  }, [change, tokens, networkId])

  const value = change.in?.value ?? change.out?.value
  const rawValue = change.in?.raw_value ?? change.out?.raw_value

  if (action && token && rawValue)
    return (
      <>
        {t(action)} <TokensAndFiat tokenId={token.id} planck={String(rawValue)} />
      </>
    )

  if (action && change.asset.type === "TOKEN" && value)
    return (
      <>
        {t(action)} <Tokens decimals={change.asset.decimals} amount={value} />
      </>
    )

  return <>{`[${change.asset.type}] ${change.in?.summary ?? change.out?.summary ?? ""}`}</>
}

const StateChange: FC<{
  networkId: SolNetworkId
  change: AccountStateChange
}> = ({ change, networkId }) => {
  return (
    <div className="flex w-full gap-8 p-4">
      <div className="w-20 shrink-0 pt-4">
        <StateChangeImage change={change} />
      </div>
      <div className="text-body flex grow flex-col justify-center pt-4">
        <div>
          <StateChangeDescription change={change} networkId={networkId} />
        </div>
      </div>
    </div>
  )
}

export const RiskAnalysisStateChangesSol: FC<{
  riskAnalysis: RiskAnalysisResult<"solana">
  noTitle?: boolean
}> = ({ riskAnalysis, noTitle }) => {
  const { t } = useTranslation()

  const simulation = riskAnalysis.result?.result?.simulation

  const changes = useMemo<AccountStateChange[]>(() => {
    if (!simulation) return []
    return getAccountStateChanges(simulation.account_summary)
  }, [simulation])

  if (!simulation || !changes.length || !riskAnalysis.networkId) return null

  return (
    <div className="flex w-full flex-col justify-start text-left text-sm">
      {!noTitle && <div className="text-body-secondary text-sm">{t("Expected changes")}</div>}
      {changes.map((change, i) => (
        <StateChange key={i} change={change} networkId={riskAnalysis.networkId!} />
      ))}
    </div>
  )
}
