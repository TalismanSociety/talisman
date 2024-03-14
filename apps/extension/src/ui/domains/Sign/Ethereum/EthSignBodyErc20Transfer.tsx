import { EvmAddress } from "@extension/core"
import { BalanceFormatter } from "@extension/core"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useErc20Token } from "@ui/hooks/useErc20Token"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton } from "./shared"
import { SignParamTokensButton } from "./shared/SignParamTokensButton"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

export const EthSignBodyErc20Transfer: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const nativeToken = useToken(network?.nativeToken?.id)
  const currency = useSelectedCurrency()

  const { from, value, to } = useMemo(() => {
    return {
      from: getContractCallArg<EvmAddress>(decodedTx, "from"),
      to: getContractCallArg<EvmAddress>(decodedTx, "to"),
      value: getContractCallArg<bigint>(decodedTx, "amount"),
    }
  }, [decodedTx])

  const isOnBehalf = useMemo(
    () => account && from && account.address.toLowerCase() !== from.toLowerCase(),
    [account, from]
  )

  const token = useErc20Token(network?.id, decodedTx.targetAddress)
  const tokenRates = useTokenRates(token?.id)

  const { amount, symbol } = useMemo(() => {
    const symbol = token?.symbol ?? (decodedTx.asset?.symbol as string)
    const amount = value
      ? new BalanceFormatter(value.toString(), decodedTx.asset?.decimals, tokenRates)
      : undefined

    return { amount, symbol }
  }, [tokenRates, token?.symbol, decodedTx.asset?.decimals, decodedTx.asset?.symbol, value])

  if (
    !decodedTx.targetAddress ||
    !decodedTx.asset?.decimals ||
    !amount ||
    !nativeToken ||
    !account ||
    !network ||
    !to
  )
    return <SignViewBodyShimmer />

  return (
    <SignContainer networkType="ethereum" title={t("Transfer Request")}>
      <div>{t("You are transferring")}</div>
      <div className="flex">
        <SignParamTokensButton
          address={decodedTx.targetAddress}
          network={network}
          tokenId={token?.id}
          tokens={amount.tokens}
          decimals={decodedTx.asset.decimals}
          symbol={symbol}
          fiat={amount.fiat(currency)}
          withIcon
        />
      </div>
      <div className="flex">
        <div>{t("from")}</div>
        {isOnBehalf && from ? (
          <SignParamAccountButton explorerUrl={network.explorerUrl} address={from} withIcon />
        ) : (
          <SignParamAccountButton address={account.address} />
        )}
      </div>
      <div className="flex">
        <div>{t("to")}</div>
        <SignParamAccountButton explorerUrl={network.explorerUrl} address={to} withIcon />
      </div>
      {isOnBehalf && (
        <div className="flex">
          <div>{t("with")}</div>
          <SignParamAccountButton address={account.address} withIcon />
        </div>
      )}
      <div className="flex gap-3">
        <div>{t("on")}</div>
        <TokenLogo className="inline-block" tokenId={nativeToken.id} />
        <div>{network.name}</div>
      </div>
    </SignContainer>
  )
}
