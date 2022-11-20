import useToken from "@ui/hooks/useToken"
import { BigNumber } from "ethers"
import { FC, useMemo } from "react"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import useTokens from "@ui/hooks/useTokens"
import { BalanceFormatter } from "@core/domains/balances"
import {
  SignParamAccountButton,
  SignParamNetworkAddressButton,
  SignParamTokensButton,
} from "./shared"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { SignAlertMessage } from "./shared/SignAlertMessage"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useErc20TokenImageUrl } from "@ui/hooks/useErc20TokenDisplay"
import { CustomErc20Token } from "@core/domains/tokens/types"

const ALLOWANCE_UNLIMITED = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const EthSignBodyErc20Approve: FC = () => {
  const { account, network, transactionInfo } = useEthSignTransactionRequest()
  const txInfo = transactionInfo as KnownTransactionInfo

  const tokenImageUrl = useErc20TokenImageUrl(network?.id, txInfo.targetAddress)

  const tokens = useTokens()
  const token = useMemo(() => {
    return network
      ? (tokens?.find(
          (t) =>
            t.type === "erc20" &&
            Number(t.evmNetwork?.id) === Number(network.id) &&
            t.contractAddress === txInfo.targetAddress
        ) as CustomErc20Token)
      : null
  }, [network, tokens, txInfo.targetAddress])

  const { image, symbol } = useMemo(() => {
    const image = token?.image ?? tokenImageUrl.data // TODO prioritize token.logo (waiting balance library)
    const symbol = token?.symbol ?? (txInfo.asset.symbol as string)

    return { image, symbol }
  }, [token?.image, token?.symbol, tokenImageUrl.data, txInfo.asset.symbol])

  const nativeToken = useToken(network?.nativeToken?.id)

  const { spender, allowance, isInfinite } = useMemo(() => {
    const rawAllowance = getContractCallArg<BigNumber>(txInfo.contractCall, "amount")
    const isInfinite = rawAllowance?.toHexString() === ALLOWANCE_UNLIMITED

    return {
      spender: getContractCallArg<string>(txInfo.contractCall, "spender"),
      allowance:
        rawAllowance && !isInfinite
          ? new BalanceFormatter(rawAllowance.toString(), txInfo.asset.decimals, token?.rates)
          : undefined,
      isInfinite,
    }
  }, [token?.rates, txInfo.asset.decimals, txInfo.contractCall])

  if (!nativeToken || !spender || !account || !network) return <EthSignBodyShimmer />

  return (
    <EthSignContainer
      title={
        <>
          This app wants to
          <br />
          access your funds
        </>
      }
      alert={
        <SignAlertMessage>
          <span className="text-body-secondary">
            This contract will have permission to spend tokens on your behalf until manually
            revoked.
          </span>{" "}
          <a
            className="text-white"
            href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/ethereum-features/token-approvals"
            target="_blank"
          >
            Learn more
          </a>
        </SignAlertMessage>
      }
    >
      <div className="flex">
        <div>Allow</div>
        <SignParamNetworkAddressButton network={network} address={spender} />
      </div>
      <div className="flex">
        <div>to spend{isInfinite ? " infinite" : ""}</div>
        {allowance ? (
          <SignParamTokensButton
            address={txInfo.targetAddress}
            network={network}
            tokens={allowance.tokens}
            image={image}
            decimals={txInfo.asset.decimals}
            symbol={symbol}
            fiat={allowance.fiat("usd")}
            withIcon
          />
        ) : (
          <SignParamErc20TokenButton
            address={txInfo.targetAddress}
            asset={txInfo.asset}
            network={network}
            withIcon
          />
        )}
      </div>
      <div className="flex">
        <div>from</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
    </EthSignContainer>
  )
}
