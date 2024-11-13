import { encodeAnyAddress } from "@talismn/util"
import { PolkadotAssetHubCalls, PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"

import { useChain, useChains, useTokensMap } from "@ui/state"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { getAddressFromXcmLocation } from "../../util/getAddressFromXcmLocation"
import { getChainFromXcmLocation } from "../../util/getChainFromXcmLocation"
import { getMultiAssetTokenId } from "../../util/getMultiAssetTokenId"
import {
  SummaryCrossChainTransfer,
  SummaryCrossChainTransferProps,
} from "../shared/SummaryCrossChainTransfer"

type TransferAssetArgs =
  | PolkadotCalls["XcmPallet"]["reserve_transfer_assets"]
  | PolkadotCalls["XcmPallet"]["limited_reserve_transfer_assets"]
  | PolkadotCalls["XcmPallet"]["limited_teleport_assets"]
  | PolkadotAssetHubCalls["PolkadotXcm"]["reserve_transfer_assets"]
  | PolkadotAssetHubCalls["PolkadotXcm"]["limited_reserve_transfer_assets"]
  | PolkadotAssetHubCalls["PolkadotXcm"]["limited_teleport_assets"]

const TransferAssets: DecodedCallComponent<TransferAssetArgs> = ({
  decodedCall: { args },
  sapi,
  payload,
  inline,
}) => {
  const chain = useChain(sapi.chainId)
  const tokensMap = useTokensMap()
  const chains = useChains()

  const props = useMemo<SummaryCrossChainTransferProps>(() => {
    if (!chain) throw new Error("chain not found")

    const { tokenId, value } = getMultiAssetTokenId(args.assets, chain, tokensMap)
    const token = tokensMap[tokenId]
    if (!token) throw new Error("Unknown token")

    const toNetwork = getChainFromXcmLocation(args.dest, chain, chains)
    const toAddress = getAddressFromXcmLocation(args.beneficiary)

    return {
      tokenId,
      value,
      fromNetwork: chain.id,
      toNetwork: toNetwork.id,
      fromAddress: encodeAnyAddress(payload.address, chain.prefix ?? undefined),
      toAddress: encodeAnyAddress(toAddress, toNetwork.prefix ?? undefined),
      inline: !!inline,
    }
  }, [args, payload, chain, chains, tokensMap, inline])

  return <SummaryCrossChainTransfer {...props} />
}

export const SUMMARY_COMPONENTS_XCM: DecodedCallComponentDefs = [
  ["XcmPallet", "reserve_transfer_assets", TransferAssets],
  ["XcmPallet", "limited_reserve_transfer_assets", TransferAssets],
  ["XcmPallet", "limited_teleport_assets", TransferAssets],
  ["PolkadotXcm", "reserve_transfer_assets", TransferAssets],
  ["PolkadotXcm", "limited_reserve_transfer_assets", TransferAssets],
  ["PolkadotXcm", "limited_teleport_assets", TransferAssets],
]
