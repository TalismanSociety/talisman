import { EvmExpectedStateChange } from "@blowfishxyz/api-client/v20230605"
import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { EvmTransactionScan } from "@ui/domains/Ethereum/useScanEvmTransaction"
import { BlowfishEvmChainInfo } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { RiskAnalysisImageBase, RiskAnalysisPlaceholderImage } from "./RiskAnalysisImageBase"
//import { useAssetLinkFromRawInfo } from "./useAssetLinkFromRawInfo"
import { isCurrencyStateChange, isNftStateChangeWithMetadata, isPositiveStateChange } from "./util"

type AssetImageProps = {
  isPositiveEffect: boolean
  imageUrl: string | null | undefined
  name: string
  placeholder?: "solana-logo" | "missing-image"
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
  //const placeholder = props.placeholder || "missing-image"
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
        />
      )
    }

    // if (placeholder === "solana-logo") {
    //   return (
    //     <RiskAnalysisImageBase
    //       isSolanaLogo
    //       alt="Solana logo"
    //       width={38}
    //       height={38}
    //       borderRadius="100%"
    //     />
    //   )
    // }

    return <RiskAnalysisPlaceholderImage width={38} height={38} borderRadius={6} />
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

        {/* TODO */}
        {props.type === "currency" && props.verified && <></>}
        {/* {props.verified && (
            <VerifiedBadgeWrapper>
              <Icon variant="verified" size={14} />
            </VerifiedBadgeWrapper>
          )} */}
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

  if (rawInfo.kind === "ANY_NFT_FROM_COLLECTION_TRANSFER") {
    return (
      <AssetImage
        type="nft"
        imageUrl={rawInfo.data.asset.imageUrl}
        name={rawInfo.data.asset.name}
        isPositiveEffect={isPositive}
      />
    )
  }

  // TODO
  return <AssetImage type="unknown" imageUrl={null} name="Unkonwn" isPositiveEffect={isPositive} />
}

const StateChange: FC<{ change: EvmExpectedStateChange; chainInfo: BlowfishEvmChainInfo }> = ({
  change,
  //chainInfo,
}) => {
  //const { rawInfo } = change
  // const assetLink = useAssetLinkFromRawInfo(rawInfo, chainInfo)
  // const counterpartyLink = useMemo(
  //   () => generateCounterpartyBlockExplorerUrl(rawInfo, chainInfo),
  //   [chainInfo, rawInfo]
  // )

  return (
    <div className="flex w-full gap-8 p-4">
      <div className="w-20 shrink-0 pt-4">
        <StateChangeImage rawInfo={change.rawInfo} />
      </div>
      <div className="flex grow flex-col justify-center pt-4">
        <div>{change.humanReadableDiff}</div>
        <div></div>
      </div>
    </div>
  )
}

export const RiskAnalysisStateChanges: FC<{
  scan: EvmTransactionScan
}> = ({ scan }) => {
  const { result, chainInfo } = scan

  const { t } = useTranslation()
  const changes = useMemo<EvmExpectedStateChange[]>(() => {
    if (!result) return []
    const { userAccount, expectedStateChanges } = result.simulationResults.aggregated
    return expectedStateChanges[userAccount] ?? []
  }, [result])

  if (scan.result?.simulationResults.aggregated.error) {
    //TODO
    return <div>Error : {scan.result.simulationResults.aggregated.error.humanReadableError}</div>
  }

  if (!changes.length) return null
  if (!chainInfo) return null

  return (
    <div className="flex w-full flex-col">
      <div className="text-body-secondary text-sm">{t("Simulation changes")}</div>
      {changes.map((change, i) => (
        <StateChange key={i} change={change} chainInfo={chainInfo} />
      ))}
    </div>
  )
}
