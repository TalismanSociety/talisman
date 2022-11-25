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
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { SignAlertMessage } from "./shared/SignAlertMessage"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useErc20TokenImageUrl } from "@ui/hooks/useErc20TokenDisplay"
import { CustomErc20Token } from "@core/domains/tokens/types"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

const ALLOWANCE_UNLIMITED = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const EthSignBodyErc20Approve: FC = () => {
  const { account, network, transactionInfo } = useEthSignKnownTransactionRequest()

  const tokenImageUrl = useErc20TokenImageUrl(network?.id, transactionInfo.targetAddress)

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

  const { image, symbol } = useMemo(() => {
    const image = token?.image ?? tokenImageUrl.data // TODO prioritize token.logo (waiting balance library)
    const symbol = token?.symbol ?? (transactionInfo.asset.symbol as string)

    return { image, symbol }
  }, [token?.image, token?.symbol, tokenImageUrl.data, transactionInfo.asset.symbol])

  const nativeToken = useToken(network?.nativeToken?.id)

  const { spender, allowance, isInfinite } = useMemo(() => {
    const rawAllowance = getContractCallArg<BigNumber>(transactionInfo.contractCall, "amount")
    const isInfinite = rawAllowance?.toHexString() === ALLOWANCE_UNLIMITED

    return {
      spender: getContractCallArg<string>(transactionInfo.contractCall, "spender"),
      allowance:
        rawAllowance && !isInfinite
          ? new BalanceFormatter(
              rawAllowance.toString(),
              transactionInfo.asset.decimals,
              token?.rates
            )
          : undefined,
      isInfinite,
    }
  }, [token?.rates, transactionInfo.asset.decimals, transactionInfo.contractCall])

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
            address={transactionInfo.targetAddress}
            network={network}
            tokens={allowance.tokens}
            image={image}
            decimals={transactionInfo.asset.decimals}
            symbol={symbol}
            fiat={allowance.fiat("usd")}
            withIcon
          />
        ) : (
          <SignParamErc20TokenButton
            address={transactionInfo.targetAddress}
            asset={transactionInfo.asset}
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
