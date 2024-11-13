import { encodeAnyAddress } from "@talismn/util"
import { AcalaCalls, HydrationCalls } from "papi-descriptors"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useChainByGenesisHash, useChains, useTokenRatesMap, useTokens } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { DecodedCallComponent, DecodedCallComponentDefs } from "../types"
import { getAddressFromXcmLocation } from "../util/getAddressFromXcmLocation"
import { getChainFromXcmLocation } from "../util/getChainFromXcmLocation"
import { getTokenFromCurrency } from "../util/getTokenFromCurrency"

type TransferChainCalls = AcalaCalls | HydrationCalls
type TransferArgs =
  | TransferChainCalls["XTokens"]["transfer"]
  | TransferChainCalls["XTokens"]["transfer_with_fee"]

const Transfer: DecodedCallComponent<TransferArgs> = ({ decodedCall: { args }, payload }) => {
  const { t } = useTranslation("request")
  const chain = useChainByGenesisHash(payload.genesisHash)
  const tokens = useTokens()
  const chains = useChains()
  const tokenRates = useTokenRatesMap()

  const props = useMemo(() => {
    if (!chain) throw new Error("chain not found")

    const token = getTokenFromCurrency(args.currency_id, chain, tokens)
    const targetChain = getChainFromXcmLocation(args.dest, chain, chains)
    const targetAddress = getAddressFromXcmLocation(args.dest)

    return {
      value: args.amount,
      tokenDecimals: token.decimals,
      tokenSymbol: token.symbol,
      tokenLogo: token.logo,
      tokenRates: tokenRates[token.id],
      fromNetwork: chain.id,
      toNetwork: targetChain.id,
      fromAddress: encodeAnyAddress(payload.address, chain.prefix ?? undefined),
      toAddress: encodeAnyAddress(targetAddress, targetChain.prefix ?? undefined),
    }
  }, [args, payload, chain, chains, tokenRates, tokens])

  return (
    <SignContainer
      networkType="substrate"
      title={t("Transfer")}
      header={<SignViewIconHeader icon="transfer" />}
    >
      <SignViewXTokensTransfer {...props} />
    </SignContainer>
  )
}

export const CUSTOM_UI_X_TOKENS: DecodedCallComponentDefs = [
  ["XTokens", "transfer", Transfer],
  ["XTokens", "transfer_with_fee", Transfer],
]
