import { AcalaCalls, HydrationCalls } from "@polkadot-api/descriptors"
import { encodeAnyAddress } from "@talismn/crypto"
import { useMemo } from "react"

import { useNetworkById, useNetworks, useTokens } from "@ui/state"

import { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
import { getAddressFromXcmLocation } from "../../util/getAddressFromXcmLocation"
import { getChainFromXcmLocation } from "../../util/getChainFromXcmLocation"
import { getTokenFromCurrency } from "../../util/getTokenFromCurrency"
import {
  SummaryCrossChainTransfer,
  SummaryCrossChainTransferProps,
} from "../shared/SummaryCrossChainTransfer"

type TransferChainCalls = AcalaCalls | HydrationCalls
type TransferArgs =
  | TransferChainCalls["XTokens"]["transfer"]
  | TransferChainCalls["XTokens"]["transfer_with_fee"]

const Transfer: DecodedCallSummaryComponent<TransferArgs> = ({
  decodedCall: { args },
  sapi,
  payload,
  mode,
}) => {
  const chain = useNetworkById(sapi.chainId, "polkadot")
  const tokens = useTokens()
  const chains = useNetworks({ platform: "polkadot" })

  const props = useMemo<SummaryCrossChainTransferProps>(() => {
    if (!chain) throw new Error("chain not found")

    const token = getTokenFromCurrency(args.currency_id, chain, tokens)
    const targetChain = getChainFromXcmLocation(args.dest, chain, chains)
    const targetAddress = getAddressFromXcmLocation(args.dest)

    return {
      value: args.amount,
      tokenId: token.id,
      fromNetwork: chain.id,
      toNetwork: targetChain.id,
      fromAddress: encodeAnyAddress(payload.address, { ss58Format: chain.prefix }),
      toAddress: encodeAnyAddress(targetAddress, { ss58Format: targetChain.prefix }),
      mode,
    }
  }, [args, payload, chain, chains, tokens, mode])

  return <SummaryCrossChainTransfer {...props} />
}

export const SUMMARY_COMPONENTS_X_TOKENS: DecodedCallSummaryComponentDefs = [
  ["XTokens", "transfer", Transfer],
  ["XTokens", "transfer_with_fee", Transfer],
]
