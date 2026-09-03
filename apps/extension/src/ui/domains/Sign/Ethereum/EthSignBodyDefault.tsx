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
  // set when the specialized summary of a value-carrying call crashed into this fallback: the
  // value renders here as usual, and is flagged as inconsistent with the method
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

  const callData = request.data && request.data !== "0x" ? request.data : null
  const isPlainTransfer = !!amount && !!request.to && !callData
  const undecodedSelector = callData && !decodedTx?.contractCall ? callData.slice(0, 10) : null

  if (!decodedTx) return null
  if (!network) return null
  if (!nativeToken) return null

  const nativeTokensDisplay = amount ? (
    <SignParamTokensDisplay
      withIcon
      tokenId={nativeToken.id}
      tokens={amount.tokens}
      fiat={amount}
      decimals={nativeToken.decimals}
      symbol={nativeToken.symbol}
    />
  ) : null

  return (
    <SignContainer
      networkType="ethereum"
      title={isPlainTransfer ? t("Transfer Request") : t("Transaction Request")}
      alert={
        unexpectedNativeValue || undecodedSelector ? (
          <>
            {unexpectedNativeValue && (
              <SignAlertMessage type="error">
                {t(
                  "This transaction transfers {{symbol}} to a contract method that does not normally accept it. Check the amount above before approving.",
                  { symbol: nativeToken.symbol }
                )}
              </SignAlertMessage>
            )}
            {undecodedSelector && (
              <SignAlertMessage type="error">
                {t(
                  "Talisman cannot decode this contract call, so what it does is unknown - the app could be requesting anything, including access to your funds. Only approve it if you trust this app."
                )}
              </SignAlertMessage>
            )}
          </>
        ) : null
      }
    >
      {isPlainTransfer ? (
        <>
          <div>{t("You are transferring")}</div>
          <div>{nativeTokensDisplay}</div>
          <div className="flex">
            <span>{t("from")} </span>
            <SignParamAccountButton address={request.from!} withIcon />
          </div>
          <div className="flex">
            <span>{decodedTx.isContractCall ? t("to contract") : t("to account")} </span>
            {decodedTx.isContractCall ? (
              <SignParamNetworkAddressButton network={network} address={request.to!} />
            ) : (
              <SignParamAccountButton
                explorerUrl={network.blockExplorerUrls[0]}
                address={request.to!}
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
          {nativeTokensDisplay && (
            <div className="flex">
              <span>{t("sending")}</span>
              {nativeTokensDisplay}
            </div>
          )}
        </>
      )}
      {decodedTx.contractCall?.functionName && (
        <div>
          {t("method:")} <span className="text-white">{decodedTx.contractCall.functionName}</span>
        </div>
      )}
      {undecodedSelector && (
        <div>
          {t("method id:")} <span className="text-white">{undecodedSelector}</span>
        </div>
      )}
    </SignContainer>
  )
}
