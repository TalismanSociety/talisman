import { encodeAnyAddress } from "@talismn/util"
import { AcalaCalls, HydrationCalls } from "papi-descriptors"
import { useMemo } from "react"

import { useChain, useChains, useTokens } from "@ui/state"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
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

const Transfer: DecodedCallComponent<TransferArgs> = ({
  decodedCall: { args },
  sapi,
  payload,
  inline,
}) => {
  const chain = useChain(sapi.chainId)
  const tokens = useTokens()
  const chains = useChains()

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
      fromAddress: encodeAnyAddress(payload.address, chain.prefix ?? undefined),
      toAddress: encodeAnyAddress(targetAddress, targetChain.prefix ?? undefined),
      inline: !!inline,
    }
  }, [args, payload, chain, chains, tokens, inline])

  return <SummaryCrossChainTransfer {...props} />
}

export const SUMMARY_COMPONENTS_X_TOKENS: DecodedCallComponentDefs = [
  ["XTokens", "transfer", Transfer],
  ["XTokens", "transfer_with_fee", Transfer],
]
