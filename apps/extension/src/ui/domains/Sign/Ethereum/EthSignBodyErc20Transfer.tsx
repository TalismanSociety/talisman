import { BalanceFormatter } from "@core/domains/balances"
import { CustomErc20Token } from "@core/domains/tokens/types"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import useTokens from "@ui/hooks/useTokens"
import { BigNumber } from "ethers"
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
  const { account, network, transactionInfo } = useEthSignKnownTransactionRequest()

  const nativeToken = useToken(network?.nativeToken?.id)

  const { from, value, to } = useMemo(() => {
    return {
      from: getContractCallArg<string>(transactionInfo.contractCall, "from"),
      to: getContractCallArg<string>(transactionInfo.contractCall, "to"),
      value: getContractCallArg<BigNumber>(transactionInfo.contractCall, "amount"),
    }
  }, [transactionInfo?.contractCall])

  const isOnBehalf = useMemo(
    () => account && from && account.address.toLowerCase() !== from.toLowerCase(),
    [account, from]
  )

  const { tokens } = useTokens(true)
  const token = useMemo(() => {
    return network
      ? (tokens?.find(
          (t) =>
            t.type === "evm-erc20" &&
            t.evmNetwork?.id === network.id &&
            t.contractAddress === transactionInfo.targetAddress
        ) as CustomErc20Token)
      : undefined
  }, [network, tokens, transactionInfo.targetAddress])

  const tokenRates = useTokenRates(token?.id)

  const { amount, symbol } = useMemo(() => {
    const symbol = token?.symbol ?? (transactionInfo.asset.symbol as string)
    const amount = value
      ? new BalanceFormatter(value.toString(), transactionInfo.asset.decimals, tokenRates)
      : undefined

    return { amount, symbol }
  }, [
    tokenRates,
    token?.symbol,
    transactionInfo.asset.decimals,
    transactionInfo.asset.symbol,
    value,
  ])

  if (!amount || !nativeToken || !account || !network || !to) return <SignViewBodyShimmer />

  return (
    <SignContainer networkType="ethereum" title={t("Transfer Request")}>
      <div>{t("You are transferring")}</div>
      <div className="flex">
        <SignParamTokensButton
          address={transactionInfo.targetAddress}
          network={network}
          tokenId={token?.id}
          erc20={{ evmNetworkId: network.id, contractAddress: transactionInfo.targetAddress }}
          tokens={amount.tokens}
          decimals={transactionInfo.asset.decimals}
          symbol={symbol}
          fiat={amount.fiat("usd")}
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
