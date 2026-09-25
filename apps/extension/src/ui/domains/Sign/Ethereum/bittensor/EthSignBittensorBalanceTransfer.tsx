import {
  BITTENSOR_SS58_PREFIX,
  getBittensorEvmPairByEvmNetworkId,
} from "@core/domains/bittensor/constants"
import { encodeAddressSs58 } from "@talismn/crypto"
import { hexToU8a } from "@talismn/util"
import { useCoinGeckoTokenRates } from "@ui/hooks/useCoingeckoTokenRates"
import { useToken } from "@ui/state/chaindata"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewXTokensTransfer } from "../../Views/transfer/SignViewCrossChainTransfer"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignBittensorBalanceTransfer: FC = () => {
  const { t } = useTranslation()
  const { network, decodedTx, account } = useEthSignKnownTransactionRequest()
  const nativeToken = useToken(network?.nativeTokenId)
  const pair = getBittensorEvmPairByEvmNetworkId(network?.id)

  const destination = useMemo(() => {
    const pubkey = getContractCallArg<`0x${string}`>(decodedTx, "data")
    return pubkey ? encodeAddressSs58(hexToU8a(pubkey), BITTENSOR_SS58_PREFIX) : undefined
  }, [decodedTx])

  const { data: tokenRates } = useCoinGeckoTokenRates(nativeToken?.coingeckoId)

  if (
    decodedTx.value === undefined ||
    !nativeToken ||
    !network ||
    !account ||
    !pair ||
    !destination
  )
    throw new Error("Missing parameter(s)")

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Transfer")}
      header={<SignViewIconHeader icon="transfer" />}
    >
      <SignViewXTokensTransfer
        value={decodedTx.value}
        tokenDecimals={nativeToken.decimals}
        tokenSymbol={nativeToken.symbol}
        tokenLogo={nativeToken.logo}
        tokenRates={tokenRates}
        fromNetwork={network.id}
        fromAddress={account.address}
        toNetwork={pair.substrateNetworkId}
        toAddress={destination}
      />
    </SignContainer>
  )
}
