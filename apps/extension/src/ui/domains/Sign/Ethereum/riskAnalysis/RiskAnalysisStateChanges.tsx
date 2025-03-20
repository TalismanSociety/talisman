import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { classNames, formatDecimals, isAddressEqual } from "@talismn/util"
import { EvmNetworkId } from "extension-core"
import { log } from "extension-shared"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import urlJoin from "url-join"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useEvmNetwork } from "@ui/state"

import { RiskAnalysisImageBase, RiskAnalysisPlaceholderImage } from "./RiskAnalysisImageBase"
import { EvmRiskAnalysis, TenderlyChange } from "./types"
import { formatPriceString, getOperationSide, isPositiveStateChange } from "./util"

type AssetImageProps = {
  side?: "Send" | "Receive" | null
  imageUrl: string | null | undefined
  name: string
  rounded?: boolean
  type: "currency" | "nft" | "unknown"
}

const AssetImage = (props: AssetImageProps) => {
  const content = useMemo(() => {
    // if (props.type === "currency") {
    //   return (
    //     <>
    //       <RiskAnalysisImageBase
    //         src={props.imageUrl}
    //         alt={props.name}
    //         width={40}
    //         height={40}
    //         borderRadius="100%"
    //         type="currency"
    //       />
    //     </>
    //   )
    // }

    // if (props.type === "nft") {
    //   return (
    //     <RiskAnalysisImageBase
    //       src={props.imageUrl}
    //       alt={props.name || ""}
    //       width={40}
    //       height={40}
    //       borderRadius={6}
    //       type="nft"
    //     />
    //   )
    // }

    if (props.imageUrl)
      return (
        <RiskAnalysisImageBase
          type={props.type}
          src={props.imageUrl}
          alt={props.name || ""}
          width={40}
          height={40}
          // rounded={props.rounded}
          //borderRadius={props.rounded ? "100%" : 6}
        />
      )

    return (
      <RiskAnalysisPlaceholderImage type={props.type} width={38} height={38} borderRadius={6} />
    )
  }, [props])

  return (
    <div className="relative">
      {content}

      {!!props.side && (
        <div
          className={classNames(
            "absolute -right-4 -top-4 h-10 w-10 rounded-full p-1",
            props.side === "Receive" && "bg-[#16541D]",
            props.side === "Send" && "bg-[#262C54]",
          )}
        >
          {props.side === "Receive" && <ArrowDownIcon className="text-green h-8 w-8" />}
          {props.side === "Send" && <ArrowUpIcon className="h-8 w-8 text-[#6A7AEB]" />}
        </div>
      )}
    </div>
  )
}

const StateChangeImage: FC<{
  change: TenderlyChange
  evmNetworkId: EvmNetworkId
  signer: string
}> = ({ change, signer }) => {
  const side = getOperationSide(change, signer)

  //const isPositive = isPositiveStateChange(change, signer)

  // if (isCurrencyStateChange(rawInfo)) {
  //   return (
  //     <AssetImage
  //       type="currency"
  //       imageUrl={rawInfo.data.asset.imageUrl}
  //       name={rawInfo.data.asset.name}
  //       verified={rawInfo.data.asset.verified}
  //       isPositiveEffect={isPositive}
  //     />
  //   )
  // }
  // if (isNftStateChangeWithMetadata(rawInfo)) {
  //   const { metadata, asset } = rawInfo.data
  //   const imageUrl = metadata.previews?.small || metadata.rawImageUrl

  //   return (
  //     <AssetImage type="nft" imageUrl={imageUrl} name={asset.name} isPositiveEffect={isPositive} />
  //   )
  // }

  // switch (rawInfo.kind) {
  //   case "ANY_NFT_FROM_COLLECTION_TRANSFER":
  //     return (
  //       <AssetImage
  //         type="nft"
  //         imageUrl={rawInfo.data.asset.imageUrl}
  //         name={rawInfo.data.asset.name}
  //         isPositiveEffect={isPositive}
  //       />
  //     )
  //   case "ERC721_APPROVAL_FOR_ALL":
  //   case "ERC721_LOCK":
  //   case "ERC721_LOCK_APPROVAL":
  //   case "ERC721_LOCK_APPROVAL_FOR_ALL":
  //   case "ERC721_TRANSFER":
  //     return <AssetImage type="nft" imageUrl={null} name="Unknown" isPositiveEffect={isPositive} />
  //   default:
  //     return (
  //       <AssetImage type="unknown" imageUrl={null} name="Unknown" isPositiveEffect={isPositive} />
  //     )
  // }

  const type = useMemo<"currency" | "nft" | "unknown">(() => {
    if (change.assetInfo.type === "Fungible") return "currency"
    //if(change.kind === "exposure" && change.type === "Approve")
    return "unknown"
  }, [change])

  // const imageUrl = useMemo(() => (change.kind === "asset" ? change.assetInfo.logo : null), [change])

  return (
    <AssetImage
      type={type}
      imageUrl={change.assetInfo.logo ?? null}
      name="Unknown"
      side={side}
      rounded={type === "currency"}
    />
  )
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

const getTokenExplorerUrl = (
  explorerUrl: string | null | undefined,
  tokenAddress: string | null | undefined,
) => {
  if (!explorerUrl || !tokenAddress) return ""
  return urlJoin(explorerUrl, "token", tokenAddress)
}

const getAddressExplorerUrl = (
  explorerUrl: string | null | undefined,
  address: string | null | undefined,
) => {
  if (!explorerUrl || !address) return ""
  return urlJoin(explorerUrl, "address", address)
}

const StateChangeFooter: FC<{
  change: TenderlyChange
  evmNetworkId: EvmNetworkId
  signer: string
}> = ({ change, evmNetworkId, signer }) => {
  const network = useEvmNetwork(evmNetworkId)

  const { t } = useTranslation()

  if (change.kind === "asset") {
    const assetLink = getTokenExplorerUrl(network?.explorerUrl, change.assetInfo.contractAddress)
    const isPositive = isPositiveStateChange(change, signer)
    const targetAddress = isPositive ? change.from : change.to
    const counterPartyLink = getAddressExplorerUrl(network?.explorerUrl, targetAddress)

    // const fungible = isFungible(change.assetInfo)

    return (
      <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
        <FooterFieldLink href={assetLink} label={t("Asset:")} value={change.assetInfo.name} />

        {!!targetAddress && (
          <FooterFieldLink
            href={counterPartyLink}
            label={isPositive ? t("From:") : t("To:")}
            value={shortenAddress(targetAddress, 6, 4)}
          />
        )}
      </div>
    )
  }

  if (change.kind === "exposure") {
    const assetLink = getTokenExplorerUrl(network?.explorerUrl, change.assetInfo.contractAddress)
    const counterPartyLink = getAddressExplorerUrl(network?.explorerUrl, change.spender)
    const fungible = isFungible(change.assetInfo)

    return fungible ? (
      <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
        <FooterFieldLink href={assetLink} label={t("Asset:")} value={change.assetInfo.name} />
        <FooterFieldLink
          href={counterPartyLink}
          label={t("Spender:")}
          value={shortenAddress(change.spender, 6, 4)}
        />
      </div>
    ) : (
      <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
        <FooterField label={"Type:"} value={change.assetInfo.standard} />
        {!!change.dollarValue && (
          <FooterField label={t("USD value:")} value={formatPriceString(change.dollarValue)} />
        )}
        <FooterFieldLink
          href={counterPartyLink}
          label={t("Spender:")}
          value={shortenAddress(change.spender, 6, 4)}
        />
      </div>
    )
  }

  // if(!isFungible(change.assetInfo)){
  //   const counterPartyLink = getAddressExplorerUrl(network?.explorerUrl)

  //     return (
  //     <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
  //       <FooterField label={"Type:"} value={change.assetInfo.standard} />
  //       {!!change.dollarValue && <FooterField label={t("Approx. value:")} value={formatPriceString(change.dollarValue)} />}
  //       {counterpartyLink && hasCounterparty(rawInfo) && rawInfo.data.counterparty?.address && (
  //         <FooterFieldLink
  //           href={counterpartyLink}
  //           label={isPositiveEffect ? t("From:") : t("To:")}
  //           value={shortenAddress(rawInfo.data.counterparty.address, 6, 4)}
  //         />
  //       )}
  //     </div>
  //   )
  // }

  // if (isCurrencyStateChange(rawInfo)) {
  //   return (
  //     <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
  //       <FooterFieldLink href={assetLink} label={t("Asset:")} value={rawInfo.data.asset.name} />
  //       {counterpartyLink && hasCounterparty(rawInfo) && rawInfo.data.counterparty?.address && (
  //         <FooterFieldLink
  //           href={counterpartyLink}
  //           label={isPositiveEffect ? t("From:") : t("To:")}
  //           value={shortenAddress(rawInfo.data.counterparty.address, 6, 4)}
  //         />
  //       )}
  //     </div>
  //   )
  // } else if (isNftStateChange(rawInfo)) {
  //   const price = getAssetPriceInUsd(rawInfo)
  //   let typeStr: string | undefined = undefined

  //   if (rawInfo.kind.includes("ERC721")) {
  //     typeStr = "ERC-721"
  //   } else if (rawInfo.kind.includes("ERC1155")) {
  //     typeStr = "ERC-1155"
  //   }

  //   return (
  //     <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
  //       <FooterField label={"Type:"} value={typeStr} />
  //       {!!price && <FooterField label={t("Floor price:")} value={formatPrice(price)} />}
  //       {counterpartyLink && hasCounterparty(rawInfo) && rawInfo.data.counterparty?.address && (
  //         <FooterFieldLink
  //           href={counterpartyLink}
  //           label={isPositiveEffect ? t("From:") : t("To:")}
  //           value={shortenAddress(rawInfo.data.counterparty.address, 6, 4)}
  //         />
  //       )}
  //     </div>
  //   )
  // }
  return null
}

const isFungible = (assetInfo: TenderlyChange["assetInfo"]) => {
  switch (assetInfo.type) {
    case "Native":
    case "Fungible":
      return true

    default:
      return false
  }
}

const HumanReadableDiff: FC<{
  change: TenderlyChange
  evmNetworkId: EvmNetworkId
  signer: string
}> = ({ change, evmNetworkId, signer }) => {
  const network = useEvmNetwork(evmNetworkId)
  const { t } = useTranslation()

  const text = useMemo(() => {
    if (change.kind === "asset" && isFungible(change.assetInfo) && change.type === "Transfer") {
      if (change.from && isAddressEqual(change.from, signer))
        return `Send ${formatDecimals(change.amount)} ${change.assetInfo.symbol.toUpperCase()}`
      else if (isAddressEqual(change.to, signer))
        return `Receive ${formatDecimals(change.amount)} ${change.assetInfo.symbol.toUpperCase()}`
    }

    if (change.kind === "asset")
      return `${change.type} ${formatDecimals(change.amount)} ${change.assetInfo.symbol.toUpperCase()}`

    if (change.type && change.amount && change.assetInfo.symbol)
      return `${change.type} ${formatDecimals(change.amount)} ${change.assetInfo.symbol.toUpperCase()}`

    log.warn("HumanReadableDiff: unknown change kind", change, evmNetworkId, signer)
    return null
  }, [change, evmNetworkId, signer])

  if (change.type && change.assetInfo.contractAddress) {
    const contractLink = getAddressExplorerUrl(
      network?.explorerUrl,
      change.assetInfo.contractAddress,
    )
    return (
      <div className="flex items-center gap-6">
        <div>{change.type}</div>
        <FooterFieldLink
          href={contractLink}
          label={t("Contract:")}
          value={shortenAddress(change.assetInfo.contractAddress, 6, 4)}
        />
      </div>
    )
  }

  if (!text) return <div></div>

  return <div>{text}</div>
}

const StateChange: FC<{
  change: TenderlyChange
  evmNetworkId: EvmNetworkId
  signer: string
}> = ({ change, evmNetworkId, signer }) => (
  <div className="flex w-full gap-8 p-4">
    <div className="w-20 shrink-0 pt-4">
      <StateChangeImage change={change} evmNetworkId={evmNetworkId} signer={signer} />
    </div>
    <div className="text-body flex grow flex-col justify-center gap-2 overflow-hidden pt-4">
      <HumanReadableDiff change={change} evmNetworkId={evmNetworkId} signer={signer} />
      <StateChangeFooter change={change} evmNetworkId={evmNetworkId} signer={signer} />
    </div>
  </div>
)

export const RiskAnalysisStateChanges: FC<{
  signer: string
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis, signer }) => {
  const { t } = useTranslation()

  const assetChanges = useMemo(() => {
    return (
      riskAnalysis.result?.simulation.assetChanges
        ?.filter((c) =>
          [c.from, c.to]
            .filter((addr): addr is string => !!addr)
            .some((addre) => isAddressEqual(addre, signer)),
        )
        .map<TenderlyChange>((c) => ({
          kind: "asset",
          ...c,
        })) ?? []
    )
  }, [riskAnalysis, signer])

  const exposureChanges = useMemo(() => {
    return (
      riskAnalysis.result?.simulation.exposureChanges
        ?.filter((c) =>
          [c.spender, c.owner]
            .filter((addr): addr is string => !!addr)
            .some((addre) => isAddressEqual(addre, signer)),
        )
        .map<TenderlyChange>((c) => ({
          kind: "exposure",
          ...c,
        })) ?? []
    )
  }, [riskAnalysis, signer])

  const { evmNetworkId } = riskAnalysis
  if (!evmNetworkId) return null
  if (!assetChanges.length && !exposureChanges.length) return null

  return (
    <div className="flex w-full flex-col">
      {!!assetChanges.length && (
        <>
          <div className="text-body-secondary text-sm">{t("Expected changes")}</div>
          {assetChanges.map((change, i) => (
            <StateChange key={i} change={change} evmNetworkId={evmNetworkId} signer={signer} />
          ))}
        </>
      )}
      {!!exposureChanges.length && (
        <>
          <div className="text-body-secondary text-sm">{t("Exposure changes")}</div>
          {exposureChanges.map((change, i) => (
            <StateChange key={i} change={change} evmNetworkId={evmNetworkId} signer={signer} />
          ))}
        </>
      )}
    </div>
  )
}
