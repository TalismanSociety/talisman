import { BalanceFormatter } from "@extension/core"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../SignContainer"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { SignParamTokensDisplay } from "./shared/SignParamTokensDisplay"

export const EthSignBodyDefault: FC = () => {
  const { t } = useTranslation("request")
  const { network, request, decodedTx } = useEthSignTransactionRequest()

  const nativeToken = useToken(network?.nativeToken?.id)
  const nativeTokenRates = useTokenRates(nativeToken?.id)

  const amount = useMemo(() => {
    return nativeToken && decodedTx?.value && decodedTx.value > 0n
      ? new BalanceFormatter(decodedTx.value.toString(), nativeToken.decimals, nativeTokenRates)
      : null
  }, [nativeToken, nativeTokenRates, decodedTx?.value])

  if (!decodedTx) return null
  if (!network) return null
  if (!nativeToken) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={amount && request.to ? t("Transfer Request") : t("Transaction Request")}
    >
      {amount && request.to ? (
        <>
          <div>{t("You are transferring")}</div>
          <div>
            <SignParamTokensDisplay
              withIcon
              tokenId={nativeToken.id}
              tokens={amount.tokens}
              fiat={amount}
              decimals={nativeToken.decimals}
              symbol={nativeToken.symbol}
            />
          </div>
          <div className="flex">
            <span>{t("from")} </span>
            <SignParamAccountButton address={request.from} withIcon />
          </div>
          <div className="flex">
            <span>{decodedTx.isContractCall ? t("to contract") : t("to account")} </span>
            {decodedTx.isContractCall ? (
              <SignParamNetworkAddressButton network={network} address={request.to} />
            ) : (
              <SignParamAccountButton
                explorerUrl={network.explorerUrl}
                address={request.to}
                withIcon
              />
            )}
          </div>
        </>
      ) : (
        <>
          <div>{t("You are submitting a transaction")}</div>
          <div className="flex">
            <span>{t("with")}</span>
            <SignParamAccountButton address={request.from} withIcon />
          </div>
          {request.to ? (
            <div className="flex">
              <span>{t("on contract")}</span>
              <SignParamNetworkAddressButton network={network} address={request.to} />
            </div>
          ) : null}
        </>
      )}
      {decodedTx.contractCall?.functionName && (
        <div>
          {t("method:")} <span className="text-white">{decodedTx.contractCall.functionName}</span>
        </div>
      )}
    </SignContainer>
  )
}
