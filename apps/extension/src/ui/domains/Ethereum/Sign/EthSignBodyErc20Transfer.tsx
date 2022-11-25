import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import useToken from "@ui/hooks/useToken"
import { FC, useMemo } from "react"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import useTokens from "@ui/hooks/useTokens"
import { BalanceFormatter } from "@core/domains/balances"
import { SignParamAccountButton } from "./shared"
import { SignParamTokensButton } from "./shared/SignParamTokensButton"
import { EthSignContainer } from "./shared/EthSignContainer"
import { BigNumber } from "ethers"
import { CustomErc20Token } from "@core/domains/tokens/types"
import { useErc20TokenImageUrl } from "@ui/hooks/useErc20TokenDisplay"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

export const EthSignBodyErc20Transfer: FC = () => {
  const { account, network, transactionInfo } = useEthSignKnownTransactionRequest()

  const nativeToken = useToken(network?.nativeToken?.id)
  const tokenImageUrl = useErc20TokenImageUrl(network?.id, transactionInfo.targetAddress)

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

  const tokens = useTokens()
  const token = useMemo(() => {
    return network
      ? (tokens?.find(
          (t) =>
            t.type === "erc20" &&
            Number(t.evmNetwork?.id) === Number(network.id) &&
            t.contractAddress === transactionInfo.targetAddress
        ) as CustomErc20Token)
      : null
  }, [network, tokens, transactionInfo.targetAddress])

  const { image, amount, symbol } = useMemo(() => {
    const image = token?.image ?? tokenImageUrl.data // TODO prioritize token.logo (waiting balance library)
    const symbol = token?.symbol ?? (transactionInfo.asset.symbol as string)
    const amount = value
      ? new BalanceFormatter(value.toString(), transactionInfo.asset.decimals, token?.rates)
      : undefined

    return { image, amount, symbol }
  }, [
    token?.image,
    token?.rates,
    token?.symbol,
    tokenImageUrl,
    transactionInfo.asset.decimals,
    transactionInfo.asset?.symbol,
    value,
  ])

  if (!amount || !nativeToken || !account || !network || !to) return <EthSignBodyShimmer />

  return (
    <EthSignContainer title="Transfer Request">
      <div>You are transferring</div>
      <div className="flex">
        <SignParamTokensButton
          address={transactionInfo.targetAddress}
          network={network}
          tokens={amount.tokens}
          image={image}
          decimals={transactionInfo.asset.decimals}
          symbol={symbol}
          fiat={amount.fiat("usd")}
          withIcon
        />
      </div>
      <div className="flex">
        <div>from</div>
        {isOnBehalf && from ? (
          <SignParamAccountButton explorerUrl={network.explorerUrl} address={from} withIcon />
        ) : (
          <SignParamAccountButton address={account.address} />
        )}
      </div>
      <div className="flex">
        <div>to</div>
        <SignParamAccountButton explorerUrl={network.explorerUrl} address={to} withIcon />
      </div>
      {isOnBehalf && (
        <div className="flex">
          <div>with</div>
          <SignParamAccountButton address={account.address} withIcon />
        </div>
      )}
      <div className="flex gap-3">
        <div>on</div>
        <TokenLogo className="inline-block" tokenId={nativeToken.id} />
        <div>{network.name}</div>
      </div>
    </EthSignContainer>
  )
}
