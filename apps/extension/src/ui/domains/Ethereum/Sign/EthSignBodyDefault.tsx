import { BalanceFormatter } from "@core/domains/balances"
import { getTokenLogoUrl } from "@ui/domains/Asset/TokenLogo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import useToken from "@ui/hooks/useToken"
import { FC, useMemo } from "react"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
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
    <>
      <h1 className="!leading-base font-sans !text-lg !font-bold">Transaction Request</h1>
      <div className="flex w-full flex-col">
        {amount ? (
          <>
            <div className="py-1">You are transferring</div>
            <div className="py-3">
              <SignParamTokensDisplay
                withIcon
                tokens={amount.tokens}
                fiat={amount.fiat("usd")}
                decimals={nativeToken.decimals}
                symbol={nativeToken.symbol}
                image={getTokenLogoUrl(nativeToken)}
              />
            </div>
            <div className="flex items-start py-1">
              <span>from </span>
              <SignParamAccountButton address={transaction.from} withIcon />
            </div>
            <div className="flex items-start py-1">
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
            <div className="p-3">You are submitting a transaction</div>
            <div className="flex items-start py-1">
              <span>with</span>
              <SignParamAccountButton address={transaction.from} withIcon />
            </div>
            <div className="flex items-start py-1">
              <span>on contract</span>
              <SignParamNetworkAddressButton network={network} address={transaction.to} />
            </div>
          </>
        )}
        {transactionInfo.contractCall?.name && (
          <div className="flex items-start p-1">
            <div>calling method</div>
            <div className="text-white">{transactionInfo.contractCall.name}</div>
          </div>
        )}
      </div>
      <div className="my-16 text-center">
        <ViewDetailsEth />
      </div>
    </>
  )
}
