import { PolkadotAssetHubCalls, PolkadotCalls } from "@polkadot-api/descriptors"
import { encodeAnyAddress } from "@talismn/util"
import { useMemo } from "react"

import { useChain, useChains, useTokensMap } from "@ui/state"

import { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
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

const TransferAssets: DecodedCallSummaryComponent<TransferAssetArgs> = ({
  decodedCall: { args },
  sapi,
  payload,
  mode,
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
      mode,
    }
  }, [args, payload, chain, chains, tokensMap, mode])

  return <SummaryCrossChainTransfer {...props} />
}

export const SUMMARY_COMPONENTS_XCM: DecodedCallSummaryComponentDefs = [
  ["XcmPallet", "reserve_transfer_assets", TransferAssets],
  ["XcmPallet", "limited_reserve_transfer_assets", TransferAssets],
  ["XcmPallet", "limited_teleport_assets", TransferAssets],
  ["PolkadotXcm", "reserve_transfer_assets", TransferAssets],
  ["PolkadotXcm", "limited_reserve_transfer_assets", TransferAssets],
  ["PolkadotXcm", "limited_teleport_assets", TransferAssets],
]
