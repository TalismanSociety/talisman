import {
  EvmChainFamily,
  EvmChainNetwork,
  EvmExpectedStateChange,
} from "@blowfishxyz/api-client/v20230605"

import {
  chainToBlockExplorerUrl,
  isApprovalForAllStateChange,
  isCurrencyStateChange,
  isNftStateChange,
} from "./util"

export function useAssetLinkFromRawInfo(
  rawInfo: EvmExpectedStateChange["rawInfo"],
  {
    chainFamily,
    chainNetwork,
  }: {
    chainFamily: EvmChainFamily | undefined
    chainNetwork: EvmChainNetwork | undefined
  }
) {
  if (!chainFamily || !chainNetwork) {
    return undefined
  }

  if (isCurrencyStateChange(rawInfo)) {
    return chainToBlockExplorerUrl({
      chainFamily,
      chainNetwork,
      address: rawInfo.data.asset.address,
    })
  } else if (isApprovalForAllStateChange(rawInfo)) {
    return chainToBlockExplorerUrl({
      chainFamily,
      chainNetwork,
      address: rawInfo.data.asset.address,
      isApprovalForAllStateChange: rawInfo.data.asset.address,
    })
  } else if (isNftStateChange(rawInfo)) {
    return chainToBlockExplorerUrl({
      chainFamily,
      chainNetwork,
      address: rawInfo.data.asset.address,
      nftTokenId: rawInfo.data.tokenId,
    })
  }
  return undefined
}
