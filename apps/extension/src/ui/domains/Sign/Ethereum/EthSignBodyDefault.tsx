import { BalanceFormatter } from "@talismn/balances"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { SignParamTokensDisplay } from "./shared/SignParamTokensDisplay"

type EthSignBodyDefaultProps = {
  // set when a call we recognize carries a native value: its specialized summary would have dropped
  // the value, so it is rendered here instead and flagged as inconsistent with the method
  unexpectedNativeValue?: boolean
}

export const EthSignBodyDefault: FC<EthSignBodyDefaultProps> = ({ unexpectedNativeValue }) => {
  const { t } = useTranslation()
  const { network, request, decodedTx } = useEthSignTransactionRequest()

  const nativeToken = useToken(network?.nativeTokenId)
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
      alert={
        unexpectedNativeValue ? (
          <SignAlertMessage type="error">
            {t(
              "This transaction attaches {{symbol}} to a contract method that does not normally accept it. Check the amount above before approving.",
              { symbol: nativeToken.symbol }
            )}
          </SignAlertMessage>
        ) : null
      }
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
            <SignParamAccountButton address={request.from!} withIcon />
          </div>
          <div className="flex">
            <span>{decodedTx.isContractCall ? t("to contract") : t("to account")} </span>
            {decodedTx.isContractCall ? (
              <SignParamNetworkAddressButton network={network} address={request.to} />
            ) : (
              <SignParamAccountButton
                explorerUrl={network.blockExplorerUrls[0]}
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
            <SignParamAccountButton address={request.from!} withIcon />
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
