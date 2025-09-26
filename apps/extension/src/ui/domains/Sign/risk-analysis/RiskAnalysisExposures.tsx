import {
  Erc20Exposure,
  Erc721Exposure,
  Erc1155Exposure,
  TransactionScanResponse,
} from "@blockaid/client/resources/index.mjs"
import { getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import { toPairs, values } from "lodash-es"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useNetworkById } from "@ui/state"

import { RiskAnalysisAssetImage } from "./RiskAnalysisAssetImage"
import { RiskAnalysis } from "./types"

const ExposureImage: FC<{ exposure: Exposure }> = ({ exposure }) => {
  switch (exposure.asset_type) {
    case "ERC20":
      return (
        <RiskAnalysisAssetImage
          type="currency"
          imageUrl={exposure.asset.logo_url}
          name={exposure.asset.name ?? exposure.asset.symbol!}
          side="out"
        />
      )
    case "ERC721":
    case "ERC1155":
      return (
        <RiskAnalysisAssetImage
          type="nft"
          imageUrl={exposure.asset.logo_url}
          name={exposure.asset.name ?? exposure.asset.symbol!}
          side="out"
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

const ExposureFooter: FC<{
  exposure: Exposure
  networkId: NetworkId | undefined
}> = ({ exposure, networkId }) => {
  const network = useNetworkById(networkId)
  const { t } = useTranslation()

  const assetLink = useMemo(() => {
    if (!network) return null
    return (
      getBlockExplorerUrls(network, { type: "address", address: exposure.asset.address })[0] ?? null
    )
  }, [exposure, network])

  const counterpartyLink = useMemo(() => {
    if (!network) return null
    return getBlockExplorerUrls(network, { type: "address", address: exposure.spender })[0] ?? null
  }, [network, exposure])

  return (
    <div className="flex max-w-full flex-wrap items-center overflow-hidden">
      {assetLink && (
        <FooterFieldLink href={assetLink} label={t("Asset:")} value={exposure.asset.name} />
      )}
      {counterpartyLink && (
        <FooterFieldLink
          href={counterpartyLink}
          label={t("Spender:")}
          value={shortenAddress(exposure.spender, 6, 4)}
        />
      )}
    </div>
  )
}

const ExposureEntry: FC<{
  exposure: Exposure
  networkId: NetworkId | undefined
}> = ({ exposure, networkId }) => (
  <div className="flex w-full gap-8 p-4">
    <div className="w-20 shrink-0 pt-4">
      <ExposureImage exposure={exposure} />
    </div>
    <div className="text-body flex grow flex-col justify-center gap-2 overflow-hidden pt-4">
      <div>{exposure.exposure.summary}</div>
      <ExposureFooter exposure={exposure} networkId={networkId} />
    </div>
  </div>
)

const getExposures = (scan: TransactionScanResponse | null | undefined) => {
  if (scan?.simulation?.status !== "Success") return []
  return values(scan.simulation.exposures)
    .flat()
    .flatMap(({ spenders, ...rest }) =>
      toPairs(spenders as Record<string, Erc20Exposure | Erc721Exposure | Erc1155Exposure>).map(
        ([spender, exposure]) => ({ ...rest, spender, exposure }),
      ),
    )
}

type Exposure = ReturnType<typeof getExposures>[number]

export const RiskAnalysisExposures: FC<{
  riskAnalysis: RiskAnalysis
}> = ({ riskAnalysis }) => {
  const { t } = useTranslation()

  const exposures = useMemo(() => {
    // EVM concept only for now
    if (riskAnalysis.platform !== "ethereum") return []
    return getExposures(riskAnalysis.result)
  }, [riskAnalysis])

  if (!exposures.length) return null

  return (
    <div className="flex w-full flex-col">
      <div className="text-body-secondary text-sm">{t("Exposure")}</div>
      {exposures.map((exposure, i) => (
        <ExposureEntry key={i} exposure={exposure} networkId={riskAnalysis.networkId} />
      ))}
    </div>
  )
}
