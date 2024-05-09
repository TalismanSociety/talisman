import { EvmExpectedStateChange } from "@blowfishxyz/api-client/v20230605"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { RiskAnalysisImageBase, RiskAnalysisPlaceholderImage } from "./RiskAnalysisImageBase"
import { BlowfishEvmChainInfo, EvmRiskAnalysis } from "./types"
import { useAssetLinkFromRawInfo } from "./useAssetLinkFromRawInfo"
import {
  formatPrice,
  generateCounterpartyBlockExplorerUrl,
  getAssetPriceInUsd,
  hasCounterparty,
  isCurrencyStateChange,
  isNftStateChange,
  isNftStateChangeWithMetadata,
  isPositiveStateChange,
} from "./util"

type AssetImageProps = {
  isPositiveEffect: boolean
  imageUrl: string | null | undefined
  name: string
} & (
  | {
      type: "currency"
      verified: boolean
    }
  | {
      type: "nft"
    }
  | {
      type: "unknown"
    }
)

const AssetImage = (props: AssetImageProps) => {
  const content = useMemo(() => {
    if (props.type === "currency") {
      return (
        <>
          <RiskAnalysisImageBase
            src={props.imageUrl}
            alt={props.name}
            width={40}
            height={40}
            borderRadius="100%"
            type="currency"
          />
        </>
      )
    }

    if (props.type === "nft") {
      return (
        <RiskAnalysisImageBase
          src={props.imageUrl}
          alt={props.name || ""}
          width={40}
          height={40}
          borderRadius={6}
          type="nft"
        />
      )
    }

    return <RiskAnalysisPlaceholderImage type="unknown" width={38} height={38} borderRadius={6} />
  }, [props])

  return (
    <div className="relative">
      {content}

      <div
        className={classNames(
          "absolute -right-4 -top-4 h-10  w-10 rounded-full p-1",
          props.isPositiveEffect ? "bg-[#16541D]" : "bg-[#262C54]"
        )}
      >
        {props.isPositiveEffect ? (
          <ArrowDownIcon className="text-green h-8 w-8" />
        ) : (
          <ArrowUpIcon className="h-8 w-8 text-[#6A7AEB]" />
        )}

        {/* TODO nice blue chip badge if props.verified === true */}
      </div>
    </div>
  )
}

const StateChangeImage: FC<{ rawInfo: EvmExpectedStateChange["rawInfo"] }> = ({ rawInfo }) => {
  const isPositive = isPositiveStateChange(rawInfo)

  if (isCurrencyStateChange(rawInfo)) {
    return (
      <AssetImage
        type="currency"
        imageUrl={rawInfo.data.asset.imageUrl}
        name={rawInfo.data.asset.name}
        verified={rawInfo.data.asset.verified}
        isPositiveEffect={isPositive}
      />
    )
  }
  if (isNftStateChangeWithMetadata(rawInfo)) {
    const { metadata, asset } = rawInfo.data
    const imageUrl = metadata.previews?.small || metadata.rawImageUrl

    return (
      <AssetImage type="nft" imageUrl={imageUrl} name={asset.name} isPositiveEffect={isPositive} />
    )
  }

  switch (rawInfo.kind) {
    case "ANY_NFT_FROM_COLLECTION_TRANSFER":
      return (
        <AssetImage
          type="nft"
          imageUrl={rawInfo.data.asset.imageUrl}
          name={rawInfo.data.asset.name}
          isPositiveEffect={isPositive}
        />
      )
    case "ERC721_APPROVAL_FOR_ALL":
    case "ERC721_LOCK":
    case "ERC721_LOCK_APPROVAL":
    case "ERC721_LOCK_APPROVAL_FOR_ALL":
    case "ERC721_TRANSFER":
      return <AssetImage type="nft" imageUrl={null} name="Unknown" isPositiveEffect={isPositive} />
    default:
      return (
        <AssetImage type="unknown" imageUrl={null} name="Unknown" isPositiveEffect={isPositive} />
      )
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
  rawInfo: EvmExpectedStateChange["rawInfo"]
  chainInfo: BlowfishEvmChainInfo
}> = ({ rawInfo, chainInfo }) => {
  const { t } = useTranslation()
  const assetLink = useAssetLinkFromRawInfo(rawInfo, chainInfo)
  const counterpartyLink = generateCounterpartyBlockExplorerUrl(rawInfo, chainInfo)
  const isPositiveEffect = useMemo(() => isPositiveStateChange(rawInfo), [rawInfo])

  if (isCurrencyStateChange(rawInfo)) {
    return (
      <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
        <FooterFieldLink href={assetLink} label={t("Asset:")} value={rawInfo.data.asset.name} />
        {counterpartyLink && hasCounterparty(rawInfo) && rawInfo.data.counterparty?.address && (
          <FooterFieldLink
            href={counterpartyLink}
            label={isPositiveEffect ? t("From:") : t("To:")}
            value={shortenAddress(rawInfo.data.counterparty.address, 6, 4)}
          />
        )}
      </div>
    )
  } else if (isNftStateChange(rawInfo)) {
    const price = getAssetPriceInUsd(rawInfo)
    let typeStr: string | undefined = undefined

    if (rawInfo.kind.includes("ERC721")) {
      typeStr = "ERC-721"
    } else if (rawInfo.kind.includes("ERC1155")) {
      typeStr = "ERC-1155"
    }

    return (
      <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
        <FooterField label={"Type:"} value={typeStr} />
        {!!price && <FooterField label={t("Floor price:")} value={formatPrice(price)} />}
        {counterpartyLink && hasCounterparty(rawInfo) && rawInfo.data.counterparty?.address && (
          <FooterFieldLink
            href={counterpartyLink}
            label={isPositiveEffect ? t("From:") : t("To:")}
            value={shortenAddress(rawInfo.data.counterparty.address, 6, 4)}
          />
        )}
      </div>
    )
  }
  return null
}

const StateChange: FC<{
  change: EvmExpectedStateChange
  chainInfo: BlowfishEvmChainInfo
}> = ({ change, chainInfo }) => (
  <div className="flex w-full gap-8 p-4">
    <div className="w-20 shrink-0 pt-4">
      <StateChangeImage rawInfo={change.rawInfo} />
    </div>
    <div className="text-body flex grow flex-col justify-center gap-2 overflow-hidden pt-4">
      <div>{change.humanReadableDiff}</div>
      <StateChangeFooter rawInfo={change.rawInfo} chainInfo={chainInfo} />
    </div>
  </div>
)

export const RiskAnalysisStateChanges: FC<{
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis }) => {
  const { t } = useTranslation()

  const changes = useMemo<EvmExpectedStateChange[]>(() => {
    if (!riskAnalysis.result) return []
    if (riskAnalysis.type === "transaction") {
      const { userAccount, expectedStateChanges } = riskAnalysis.result.simulationResults.aggregated
      return expectedStateChanges[userAccount] ?? []
    }
    if (riskAnalysis.type === "message") {
      return riskAnalysis.result.simulationResults?.expectedStateChanges ?? []
    }
    return []
  }, [riskAnalysis])

  if (!changes.length) return null

  const { chainInfo } = riskAnalysis
  if (!chainInfo) return null

  return (
    <div className="flex w-full flex-col">
      <div className="text-body-secondary text-sm">{t("Expected changes")}</div>
      {changes.map((change, i) => (
        <StateChange key={i} change={change} chainInfo={chainInfo} />
      ))}
    </div>
  )
}
