/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AccountSummary,
  NativeAddressAssetBalanceChangeDiff,
  TransactionSimulation,
} from "@blockaid/client/resources/index.mjs"
// import { EvmExpectedStateChange } from "@blowfishxyz/api-client/v20230605"
import { getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useNetworkById } from "@ui/state"

import { RiskAnalysisImageBase, RiskAnalysisPlaceholderImage } from "./RiskAnalysisImageBase"
import { EvmRiskAnalysis } from "./types"

type AssetDiff =
  | AccountSummary.Erc20AddressAssetBalanceChangeDiff
  | AccountSummary.Erc721AddressAssetBalanceChangeDiff
  | AccountSummary.Erc1155AddressAssetBalanceChangeDiff
  | NativeAddressAssetBalanceChangeDiff

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

// type AssetDiff = AssetDiffRaw & {
//   side: "in" | "out"
// }

type AssetImageProps =
  | {
      type: "currency"
      side: "in" | "out"
      imageUrl: string | null | undefined
      name: string
      //verified: boolean
    }
  | {
      type: "nft"
      side: "in" | "out"
      imageUrl: string | null | undefined
      name: string
    }
  | {
      type: "unknown"
      side: "in" | "out"
    }

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
          "absolute -right-4 -top-4 h-10 w-10 rounded-full p-1",
          props.side === "in" && "bg-[#16541D]",
          props.side === "out" && "bg-[#262C54]",
        )}
      >
        {props.side === "in" && <ArrowDownIcon className="text-green h-8 w-8" />}
        {props.side === "out" && <ArrowUpIcon className="h-8 w-8 text-[#6A7AEB]" />}
        {/* {props.isPositiveEffect ? (
          <ArrowDownIcon className="text-green h-8 w-8" />
        ) : (
          <ArrowUpIcon className="h-8 w-8 text-[#6A7AEB]" />
        )} */}

        {/* TODO nice blue chip badge if props.verified === true */}
      </div>
    </div>
  )
}

const StateChangeImage: FC<{ change: AccountStateChange }> = ({ change }) => {
  switch (change.asset_type) {
    case "NATIVE":
    case "ERC20":
      return (
        <AssetImage
          type="currency"
          imageUrl={change.asset.logo_url}
          name={change.asset.name ?? change.asset.symbol!}
          side={change.side}
        />
      )
    case "ERC721":
    case "ERC1155":
      return (
        <AssetImage
          type="nft"
          imageUrl={change.asset.logo_url}
          name={change.asset.name ?? change.asset.symbol!}
          side={change.side}
        />
      )

    default:
      return null
    //return <AssetImage type="unknown" side={change.side} />
  }

  //if (isCurrencyStateChange(rawInfo)) {
  // if (assetDiff.asset_type === "ERC20" || ) {
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
  // TODO
  // const isPositive = !!assetDiff.in.length
  const network = useNetworkById(networkId)
  const { t } = useTranslation()
  // const assetLink = useAssetLinkFromRawInfo(rawInfo, chainInfo)
  const assetLink = useMemo(() => {
    if (!network) return null
    if (change.asset_type === "NATIVE") return null
    return (
      getBlockExplorerUrls(network, { type: "address", address: change.asset.address })[0] ?? null
    )
  }, [change, network])

  // const counterpartyLink = generateCounterpartyBlockExplorerUrl(rawInfo, chainInfo)
  const counterparty = useMemo(() => {
    const trace = simulation.account_summary.traces.find((trace) => {
      if (trace.trace_type !== "AssetTrace") return false
      if (change.side === "in" && trace.to_address !== simulation.params?.from) return false
      if (change.side === "out" && trace.from_address !== simulation.params?.from) return false
      return isEqual(trace.asset, change.asset)
    })

    if (!trace || trace.trace_type !== "AssetTrace") return null

    return change.side === "in" ? trace?.from_address : trace?.to_address

    //return getBlockExplorerUrls(network, {type: "address", address})[0] ?? null
  }, [change, simulation])

  const counterpartyLink = useMemo(() => {
    if (!network || !counterparty) return null
    return getBlockExplorerUrls(network, { type: "address", address: counterparty })[0] ?? null
  }, [network, counterparty])

  // const isPositiveEffect = useMemo(() => isPositiveStateChange(rawInfo), [rawInfo])

  //if (    isCurrencyStateChange(rawInfo)) {
  if (change.asset_type === "ERC20" || change.asset_type === "NATIVE") {
    return (
      <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
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
  } else if (change.asset_type === "ERC721" || change.asset_type === "ERC1155") {
    return null
    // const price = getAssetPriceInUsd(rawInfo)
    // let typeStr: string | undefined = undefined

    // if (rawInfo.kind.includes("ERC721")) {
    //   typeStr = "ERC-721"
    // } else if (rawInfo.kind.includes("ERC1155")) {
    //   typeStr = "ERC-1155"
    // }

    // return (
    //   <div className="flex max-w-full flex-wrap items-center gap-4 overflow-hidden">
    //     <FooterField label={"Type:"} value={typeStr} />
    //     {!!price && <FooterField label={t("Floor price:")} value={formatPrice(price)} />}
    //     {counterpartyLink && hasCounterparty(rawInfo) && rawInfo.data.counterparty?.address && (
    //       <FooterFieldLink
    //         href={counterpartyLink}
    //         label={isPositiveEffect ? t("From:") : t("To:")}
    //         value={shortenAddress(rawInfo.data.counterparty.address, 6, 4)}
    //       />
    //     )}
    //   </div>
    // )
  }
  return null
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

export const RiskAnalysisStateChanges: FC<{
  riskAnalysis: EvmRiskAnalysis
}> = ({ riskAnalysis }) => {
  const { t } = useTranslation()

  // const changes = useMemo<EvmExpectedStateChange[]>(() => {
  //   if (riskAnalysis.result?.simulation?.status !== "Success") return []

  //   // TODO
  //   // riskAnalysis.result.simulation.transaction_actions
  //   // if (riskAnalysis.type === "transaction") {
  //   //   const { userAccount, expectedStateChanges } = riskAnalysis.result.simulationResults.aggregated
  //   //   return expectedStateChanges[userAccount] ?? []
  //   // }
  //   // if (riskAnalysis.type === "message") {
  //   //   return riskAnalysis.result.simulationResults?.expectedStateChanges ?? []
  //   // }
  //   return []
  // }, [riskAnalysis])

  // if (!changes.length) return null

  const simulation = useMemo(() => {
    const sim = riskAnalysis.result?.simulation
    if (sim?.status === "Success") return sim
    return null
  }, [riskAnalysis])

  const changes = useMemo<AccountStateChange[]>(() => {
    if (!simulation) return []
    return getAccountStateChanges(simulation.account_summary)
  }, [simulation])

  // TODO display an error or something?
  if (!simulation) return null

  // const { chainInfo } = riskAnalysis
  // if (!chainInfo) return null

  return (
    <div className="flex w-full flex-col">
      <div className="text-body-secondary text-sm">{t("Expected changes")}</div>
      {changes.map((change, i) => (
        <StateChange
          key={i}
          change={change}
          simulation={simulation}
          networkId={riskAnalysis.networkId}
        />
      ))}
      {/* {changes.map((change, i) => (
        <StateChange key={i} change={change} networkId={riskAnalysis.networkId} />
      ))} */}
    </div>
  )
}
