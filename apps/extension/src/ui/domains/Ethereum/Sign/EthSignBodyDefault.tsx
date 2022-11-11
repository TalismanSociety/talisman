import { BalanceFormatter } from "@core/domains/balances"
import { getTokenLogoUrl } from "@ui/domains/Asset/TokenLogo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import useToken from "@ui/hooks/useToken"
import { FC, useMemo } from "react"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { EthSignContainer } from "./shared/EthSignContainer"
import { SignParamTokensDisplay } from "./shared/SignParamTokensDisplay"

export const EthSignBodyDefault: FC = () => {
  const { network, transaction, transactionInfo } = useEthSignTransactionRequest()

  const nativeToken = useToken(network?.nativeToken?.id)

  const amount = useMemo(() => {
    return nativeToken && transactionInfo?.value?.gt(0)
      ? new BalanceFormatter(
          transactionInfo.value.toString(),
          nativeToken.decimals,
          nativeToken.rates
        )
      : null
  }, [nativeToken, transactionInfo?.value])

  if (!transactionInfo) return null

  // TODO : assert the ones below ?
  if (!network) return null
  if (!nativeToken) return null
  if (!transaction?.from) return null
  if (!transaction?.to) return null

  return (
    <EthSignContainer title="Transaction Request">
      {amount ? (
        <>
          <div>You are transferring</div>
          <div>
            <SignParamTokensDisplay
              withIcon
              tokens={amount.tokens}
              fiat={amount.fiat("usd")}
              decimals={nativeToken.decimals}
              symbol={nativeToken.symbol}
              image={getTokenLogoUrl(nativeToken)}
            />
          </div>
          <div className="flex">
            <span>from </span>
            <SignParamAccountButton address={transaction.from} withIcon />
          </div>
          <div className="flex">
            <span>to {transactionInfo.isContractCall ? "contract" : "account"} </span>
            {transactionInfo.isContractCall ? (
              <SignParamNetworkAddressButton network={network} address={transaction.to} />
            ) : (
              <SignParamAccountButton
                explorerUrl={network.explorerUrl}
                address={transaction.to}
                withIcon
              />
            )}
          </div>
        </>
      ) : (
        <>
          <div>You are submitting a transaction</div>
          <div className="flex">
            <span>with</span>
            <SignParamAccountButton address={transaction.from} withIcon />
          </div>
          <div className="flex">
            <span>on contract</span>
            <SignParamNetworkAddressButton network={network} address={transaction.to} />
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
