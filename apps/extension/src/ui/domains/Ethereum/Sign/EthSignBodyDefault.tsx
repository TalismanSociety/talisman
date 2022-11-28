import { BalanceFormatter } from "@core/domains/balances"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import useToken from "@ui/hooks/useToken"
import { useTokenRatesForTokens } from "@ui/hooks/useTokenRatesForTokens"
import { ethers } from "ethers"
import { FC, useMemo } from "react"

import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { EthSignContainer } from "./shared/EthSignContainer"
import { SignParamTokensDisplay } from "./shared/SignParamTokensDisplay"

export const EthSignBodyDefault: FC = () => {
  const { network, transactionInfo, request } = useEthSignTransactionRequest()

  const nativeToken = useToken(network?.nativeToken?.id)
  const rates = useTokenRatesForTokens(useMemo(() => [nativeToken], [nativeToken]))
  const nativeTokenRates = nativeToken && rates[nativeToken.id]

  const amount = useMemo(() => {
    return nativeToken && transactionInfo?.value?.gt(0)
      ? new BalanceFormatter(
          transactionInfo.value.toString(),
          nativeToken.decimals,
          nativeTokenRates
        )
      : null
  }, [nativeToken, nativeTokenRates, transactionInfo?.value])

  const { from, to } = useMemo(
    () => request as Required<ethers.providers.TransactionRequest>,
    [request]
  )

  if (!transactionInfo) return null
  if (!network) return null
  if (!nativeToken) return null

  return (
    <EthSignContainer title={amount ? "Transfer Request" : "Transaction Request"}>
      {amount ? (
        <>
          <div>You are transferring</div>
          <div>
            <SignParamTokensDisplay
              withIcon
              tokenId={nativeToken.id}
              tokens={amount.tokens}
              fiat={amount.fiat("usd")}
              decimals={nativeToken.decimals}
              symbol={nativeToken.symbol}
            />
          </div>
          <div className="flex">
            <span>from </span>
            <SignParamAccountButton address={from} withIcon />
          </div>
          <div className="flex">
            <span>to {transactionInfo.isContractCall ? "contract" : "account"} </span>
            {transactionInfo.isContractCall ? (
              <SignParamNetworkAddressButton network={network} address={to} />
            ) : (
              <SignParamAccountButton explorerUrl={network.explorerUrl} address={to} withIcon />
            )}
          </div>
        </>
      ) : (
        <>
          <div>You are submitting a transaction</div>
          <div className="flex">
            <span>with</span>
            <SignParamAccountButton address={from} withIcon />
          </div>
          <div className="flex">
            <span>on contract</span>
            <SignParamNetworkAddressButton network={network} address={to} />
          </div>
        </>
      )}
      {transactionInfo.contractCall?.name && (
        <div>
          method: <span className="text-white">{transactionInfo.contractCall.name}</span>
        </div>
      )}
    </EthSignContainer>
  )
}
