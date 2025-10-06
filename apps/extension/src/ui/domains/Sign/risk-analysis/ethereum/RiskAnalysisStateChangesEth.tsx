import { AccountSummary, TransactionSimulation } from "@blockaid/client/resources/index.mjs"
import { getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useNetworkById } from "@ui/state"

import { RiskAnalysisAssetImage } from "../RiskAnalysisAssetImage"
import { RiskAnalysisResult } from "../useRiskAnalysisBase"

const getAccountStateChanges = (accountSummary: AccountSummary) => {
  return accountSummary.assets_diffs.flatMap((diff) => {
    const { in: changesIn, out: changesOut, ...rest } = diff

    if (!changesIn.length && !changesOut.length) {
      log.warn("[getAccountStateChanges] assetDiff with no changes", { accountSummary, diff })
    }

    return [
      ...changesIn.map((cIn) => ({ change: cIn, side: "in" as const, ...rest })),
      ...changesOut.map((cOut) => ({ change: cOut, side: "out" as const, ...rest })),
    ]
  })
}

type AccountStateChange = ReturnType<typeof getAccountStateChanges>[number]

const StateChangeImage: FC<{ change: AccountStateChange }> = ({ change }) => {
  switch (change.asset_type) {
    case "NATIVE":
    case "ERC20":
      return (
        <RiskAnalysisAssetImage
          type="currency"
          imageUrl={change.asset.logo_url}
          name={change.asset.name ?? change.asset.symbol!}
          side={change.side}
        />
      )
    case "ERC721":
    case "ERC1155":
      return (
        <RiskAnalysisAssetImage
          type="nft"
          imageUrl={change.asset.logo_url}
          name={change.asset.name ?? change.asset.symbol!}
          side={change.side}
        />
      )

    default:
      return null
  }
}

const FooterField: FC<{ label: ReactNode; value: ReactNode; extra?: ReactNode }> = ({
  label,
  value,
  extra,
}) => (
  <span className="text-body-secondary group flex max-w-full items-center gap-[0.5em] overflow-hidden">
    <span className="text-body-secondary">{label}</span>
    <span className="text-body truncate">{value}</span>
    <span className="group-hover:text-body">{extra}</span>
  </span>
)

const FooterFieldLink: FC<{ href?: string; label: ReactNode; value: ReactNode }> = ({
  label,
  value,
  href,
}) =>
  href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <FooterField label={label} value={value} />
    </a>
  ) : (
    <FooterField label={label} value={value} />
  )

const StateChangeFooter: FC<{
  simulation: TransactionSimulation
  change: AccountStateChange
  networkId: NetworkId | undefined
}> = ({ change, networkId, simulation }) => {
  const network = useNetworkById(networkId)
  const { t } = useTranslation()

  const assetLink = useMemo(() => {
    if (!network) return null
    if (change.asset_type === "NATIVE") return null
    return (
      getBlockExplorerUrls(network, { type: "address", address: change.asset.address })[0] ?? null
    )
  }, [change, network])

  const counterparty = useMemo(() => {
    const trace = simulation.account_summary.traces.find((trace) => {
      if (trace.trace_type !== "AssetTrace") return false
      if (change.side === "in" && trace.to_address !== simulation.params?.from) return false
      if (change.side === "out" && trace.from_address !== simulation.params?.from) return false
      return isEqual(trace.asset, change.asset)
    })

    if (!trace || trace.trace_type !== "AssetTrace") return null

    return change.side === "in" ? trace?.from_address : trace?.to_address
  }, [change, simulation])

  const counterpartyLink = useMemo(() => {
    if (!network || !counterparty) return null
    return getBlockExplorerUrls(network, { type: "address", address: counterparty })[0] ?? null
  }, [network, counterparty])

  return (
    <div className="flex max-w-full flex-wrap items-center overflow-hidden">
      {assetLink && (
        <FooterFieldLink href={assetLink} label={t("Asset:")} value={change.asset.name} />
      )}
      {counterpartyLink && counterparty && (
        <FooterFieldLink
          href={counterpartyLink}
          label={change.side === "in" ? t("From:") : t("To:")}
          value={shortenAddress(counterparty, 6, 4)}
        />
      )}
    </div>
  )
}

const StateChange: FC<{
  simulation: TransactionSimulation
  change: AccountStateChange
  networkId: NetworkId | undefined
}> = ({ change, simulation, networkId }) => (
  <div className="flex w-full gap-8 p-4">
    <div className="w-20 shrink-0 pt-4">
      <StateChangeImage change={change} />
    </div>
    <div className="text-body flex grow flex-col justify-center gap-2 overflow-hidden pt-4">
      <div>{change.change.summary}</div>
      <StateChangeFooter change={change} simulation={simulation} networkId={networkId} />
    </div>
  </div>
)

export const RiskAnalysisStateChangesEth: FC<{
  riskAnalysis: RiskAnalysisResult<"ethereum">
  noTitle?: boolean
}> = ({ riskAnalysis, noTitle }) => {
  const { t } = useTranslation()

  const simulation = useMemo(() => {
    const sim = riskAnalysis.result?.simulation
    if (sim?.status === "Success") return sim
    return null
  }, [riskAnalysis])

  const changes = useMemo<AccountStateChange[]>(() => {
    if (!simulation) return []
    return getAccountStateChanges(simulation.account_summary)
  }, [simulation])

  if (!simulation || !changes.length) return null

  return (
    <div className="flex w-full flex-col">
      {!noTitle && <div className="text-body-secondary text-sm">{t("Expected changes")}</div>}
      {changes.map((change, i) => (
        <StateChange
          key={i}
          change={change}
          simulation={simulation}
          networkId={riskAnalysis.networkId}
        />
      ))}
    </div>
  )
}
