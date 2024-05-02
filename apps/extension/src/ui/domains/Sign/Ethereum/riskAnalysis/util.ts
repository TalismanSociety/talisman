import {
  EvmChainFamily,
  EvmChainNetwork,
  EvmCurrencyStateChange,
  EvmExpectedStateChange,
  EvmNftStateChange,
  EvmStateChangeErc1155ApprovalForAll,
  EvmStateChangeErc1155Transfer,
  EvmStateChangeErc20Approval,
  EvmStateChangeErc20Transfer,
  EvmStateChangeErc721Approval,
  EvmStateChangeErc721ApprovalForAll,
  EvmStateChangeErc721Lock,
  EvmStateChangeErc721LockApproval,
  EvmStateChangeErc721LockApprovalForAll,
  EvmStateChangeErc721Transfer,
  EvmStateChangeNativeAssetTransfer,
} from "@blowfishxyz/api-client"
import Decimal from "decimal.js"

// Note: most of this file has been copied from blowfish integration sample project

export const U256_MAX_VALUE = new Decimal(2).pow(256).sub(1)

export const isENS = (address = "") => address.endsWith(".eth") || address.endsWith(".xyz")

export const capitalize = (str: string) => {
  if (!str) return str
  return str[0].toUpperCase() + str.slice(1)
}

export const shortenEnsName = (name: string, showFatDots?: boolean): string => {
  const maxLength = 20

  if (name.length <= maxLength) {
    return name
  }

  const prefixLength = 6
  const suffixLength = 5
  const dots = showFatDots ? "••••" : "···"

  return `${name.substring(0, prefixLength)}${dots}${name.substring(name.length - suffixLength)}`
}

export const isNftStateChange = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): rawInfo is EvmNftStateChange => {
  return (
    rawInfo.kind === "ERC721_TRANSFER" ||
    rawInfo.kind === "ERC1155_TRANSFER" ||
    rawInfo.kind === "ERC721_LOCK" ||
    rawInfo.kind === "ERC721_LOCK_APPROVAL" ||
    rawInfo.kind === "ERC721_LOCK_APPROVAL_FOR_ALL" ||
    rawInfo.kind === "ERC721_APPROVAL" ||
    rawInfo.kind === "ERC721_APPROVAL_FOR_ALL" ||
    rawInfo.kind === "ANY_NFT_FROM_COLLECTION_TRANSFER" ||
    rawInfo.kind === "ERC1155_APPROVAL_FOR_ALL"
  )
}

export const isCurrencyStateChange = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): rawInfo is EvmCurrencyStateChange => {
  return (
    rawInfo.kind === "ERC20_APPROVAL" ||
    rawInfo.kind === "ERC20_TRANSFER" ||
    rawInfo.kind === "NATIVE_ASSET_TRANSFER" ||
    rawInfo.kind === "ERC20_PERMIT"
  )
}

const isApprovalStateChange = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): rawInfo is
  | EvmStateChangeErc20Approval
  | EvmStateChangeErc1155ApprovalForAll
  | EvmStateChangeErc721Approval
  | EvmStateChangeErc721ApprovalForAll
  | EvmStateChangeErc721LockApproval
  | EvmStateChangeErc721LockApprovalForAll => {
  return rawInfo.kind.includes("APPROVAL")
}

const isLockStateChange = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): rawInfo is
  | EvmStateChangeErc721Lock
  | EvmStateChangeErc721LockApproval
  | EvmStateChangeErc721LockApprovalForAll => {
  return rawInfo.kind.includes("LOCK")
}

export const hasCounterparty = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): rawInfo is
  | EvmStateChangeErc721Transfer
  | EvmStateChangeErc20Transfer
  | EvmStateChangeErc1155Transfer
  | EvmStateChangeNativeAssetTransfer => {
  return (
    rawInfo.kind === "ERC721_TRANSFER" ||
    rawInfo.kind === "ERC20_TRANSFER" ||
    rawInfo.kind === "ERC1155_TRANSFER" ||
    rawInfo.kind === "NATIVE_ASSET_TRANSFER"
  )
}

export const isApprovalForAllStateChange = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): rawInfo is
  | EvmStateChangeErc1155ApprovalForAll
  | EvmStateChangeErc721ApprovalForAll
  | EvmStateChangeErc721LockApprovalForAll => {
  return rawInfo.kind.includes("APPROVAL_FOR_ALL")
}

const getSimulationDiff = (rawInfo: EvmExpectedStateChange["rawInfo"]) => {
  const { amount } = rawInfo.data

  if (!amount) {
    return new Decimal(0)
  }

  if (typeof amount === "string") {
    return new Decimal(amount)
  }

  return new Decimal(amount.before).sub(amount.after)
}

export const isPositiveStateChange = (rawInfo: EvmExpectedStateChange["rawInfo"]) => {
  const isLockState = isLockStateChange(rawInfo)
  const isApproval = isApprovalStateChange(rawInfo)
  const diff = getSimulationDiff(rawInfo)

  if (isLockState || isApproval) {
    return diff.gt(0)
  }
  return diff.lt(0)
}

export const getAssetPriceInUsd = (rawInfo: EvmExpectedStateChange["rawInfo"]): number | null => {
  const pricePerToken = getAssetPricePerToken(rawInfo)

  if (isNftStateChange(rawInfo)) {
    return getAssetPricePerToken(rawInfo)
  }

  if (rawInfo.kind === "ERC20_PERMIT") {
    return null
  }

  if (isCurrencyStateChange(rawInfo) && pricePerToken !== null) {
    const difference = getSimulationDiff(rawInfo).abs()

    if (
      rawInfo.kind === "ERC20_APPROVAL" &&
      // U256_MAX_VALUE - unlimited approval
      difference.eq(U256_MAX_VALUE)
    ) {
      return null
    }

    return new Decimal(pricePerToken)
      .times(difference)
      .dividedBy(new Decimal(10).pow(rawInfo.data.asset.decimals))
      .toNumber()
  }

  return null
}

export const getAssetPricePerToken = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): number | null => {
  if ("asset" in rawInfo.data) {
    return rawInfo.data.asset.price?.dollarValuePerToken || null
  }

  return null
}

export const isNftStateChangeWithMetadata = (
  rawInfo: EvmExpectedStateChange["rawInfo"]
): rawInfo is
  | EvmStateChangeErc1155Transfer
  | EvmStateChangeErc721Approval
  | EvmStateChangeErc721Transfer => {
  switch (rawInfo.kind) {
    case "ERC1155_TRANSFER":
    case "ERC721_APPROVAL":
    case "ERC721_TRANSFER":
    case "ERC721_LOCK":
    case "ERC721_LOCK_APPROVAL":
      return true
  }
  return false
}

export const hasStateChangeImage = (rawInfo: EvmExpectedStateChange["rawInfo"]) => {
  return isCurrencyStateChange(rawInfo) || isNftStateChangeWithMetadata(rawInfo)
}

export const createValidURL = (url: string): URL | undefined => {
  try {
    return new URL(url)
  } catch (error) {
    return undefined
  }
}

export interface BlockExplorerUrlOptions {
  chainFamily: EvmChainFamily
  chainNetwork: EvmChainNetwork
  address: string
  nftTokenId?: string | null
  isApprovalForAllStateChange?: string
}

export const chainToBlockExplorerUrl = ({
  chainFamily,
  chainNetwork,
  address,
  nftTokenId,
  isApprovalForAllStateChange,
}: BlockExplorerUrlOptions): string => {
  const prefix = chainNetwork == "mainnet" ? "" : `${chainNetwork}.`
  const assetType = nftTokenId ? "nft" : isApprovalForAllStateChange ? "token" : "address"

  switch (chainFamily) {
    case "polygon":
      return `https://${prefix}polygonscan.com/address/${address}`
    case "optimism":
      return chainNetwork === "mainnet"
        ? `https://optimistic.etherscan.io/address/${address}`
        : `https://goerli-optimism.etherscan.io/address/${address}`
    case "arbitrum":
      return `https://arbiscan.io/address/${address}`
    case "bnb":
      return `https://bscscan.com/address/${address}`
    case "ethereum":
    default:
      // NOTE(kimpers): Etherscan has a more sophisticated NFT view which we can link to
      return `https://${prefix}etherscan.io/${assetType}/${address}${
        nftTokenId ? `/${nftTokenId}` : ""
      }`
  }
}

export const shortenHex = (hex: string, length = 5): string => {
  return `${hex.slice(0, length + 2)}...${hex.slice(-length)}`
}

export function generateCounterpartyBlockExplorerUrl(
  rawInfo: EvmExpectedStateChange["rawInfo"],
  {
    chainFamily,
    chainNetwork,
  }: {
    chainFamily: EvmChainFamily | undefined
    chainNetwork: EvmChainNetwork | undefined
  }
): string | undefined {
  if (!chainFamily || !chainNetwork) {
    return undefined
  }

  if (hasCounterparty(rawInfo) && rawInfo.data.counterparty) {
    return chainToBlockExplorerUrl({
      chainFamily,
      chainNetwork,
      address: rawInfo.data.counterparty.address,
    })
  }
  return undefined
}

export const formatPrice = (price: number | null) => {
  if (price === null) {
    return null
  }
  if (price < 0.01) {
    return "< $0.01"
  }
  return (
    "$" +
    price.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  )
}
