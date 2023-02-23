import { BalanceFormatter } from "@core/domains/balances"
import { CustomErc20Token } from "@core/domains/tokens/types"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import useTokens from "@ui/hooks/useTokens"
import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { SignAlertMessage } from "../../Sign/SignAlertMessage"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import {
  SignParamAccountButton,
  SignParamNetworkAddressButton,
  SignParamTokensButton,
} from "./shared"
import { EthSignContainer } from "./shared/EthSignContainer"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

const ALLOWANCE_UNLIMITED = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const EthSignBodyErc20Approve: FC = () => {
  const { account, network, transactionInfo } = useEthSignKnownTransactionRequest()

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

  const { symbol } = useMemo(() => {
    const symbol = token?.symbol ?? (transactionInfo.asset.symbol as string)

    return { symbol }
  }, [token?.symbol, transactionInfo.asset.symbol])

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
              tokenRates
            )
          : undefined,
      isInfinite,
    }
  }, [tokenRates, transactionInfo.asset.decimals, transactionInfo.contractCall])

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
            tokenId={token?.id}
            erc20={{ evmNetworkId: network.id, contractAddress: transactionInfo.targetAddress }}
            tokens={allowance.tokens}
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
