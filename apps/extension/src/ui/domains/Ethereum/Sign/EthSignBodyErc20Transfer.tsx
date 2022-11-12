import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import useToken from "@ui/hooks/useToken"
import { FC, useMemo } from "react"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import useTokens from "@ui/hooks/useTokens"
import { BalanceFormatter } from "@core/domains/balances"
import { SignParamAccountButton } from "./shared"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignParamTokensButton } from "./shared/SignParamTokensButton"
import { useErc20TokenInfo } from "@ui/hooks/useErc20TokenInfo"
import { EthSignContainer } from "./shared/EthSignContainer"
import { BigNumber } from "ethers"

export const EthSignBodyErc20Transfer: FC = () => {
  const { account, network, transactionInfo } = useEthSignTransactionRequest()

  const txInfo = transactionInfo as KnownTransactionInfo
  const nativeToken = useToken(network?.nativeToken?.id)
  const {
    token: erc20Token,
    isLoading: isLoadingErc20Token,
    error: errorToken,
  } = useErc20TokenInfo(network?.id, txInfo.targetAddress)

  const { from, value, to } = useMemo(() => {
    return {
      from: getContractCallArg<string>(txInfo.contractCall, "from"),
      to: getContractCallArg<string>(txInfo.contractCall, "to"),
      value: getContractCallArg<BigNumber>(txInfo.contractCall, "amount"),
    }
  }, [txInfo?.contractCall])

  const isOnBehalf = useMemo(
    () => account && from && account.address.toLowerCase() !== from.toLowerCase(),
    [account, from]
  )

  const tokens = useTokens()
  const token = useMemo(() => {
    return network
      ? tokens?.find(
          (t) =>
            t.type === "erc20" &&
            Number(t.evmNetwork?.id) === Number(network.id) &&
            t.contractAddress === txInfo.targetAddress
        )
      : null
  }, [network, tokens, txInfo.targetAddress])

  const { image, amount, symbol } = useMemo(() => {
    const image = erc20Token?.image // TODO prioritize token.logo (waiting balance library)
    const symbol = token?.symbol ?? (erc20Token?.symbol as string)
    const amount =
      value && erc20Token
        ? new BalanceFormatter(value.toString(), erc20Token?.decimals, token?.rates)
        : undefined

    return { image, amount, symbol }
  }, [erc20Token, token?.rates, token?.symbol, value])

  if (!amount || !erc20Token || !nativeToken || !account || !network || !to)
    return <EthSignBodyShimmer />

  return (
    <EthSignContainer title="Transfer Request">
      <div>You are transferring</div>
      <div>
        <SignParamTokensButton
          address={txInfo.targetAddress}
          network={network}
          tokens={amount.tokens}
          image={image}
          decimals={erc20Token.decimals}
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
