import useToken from "@ui/hooks/useToken"
import { BigNumber } from "ethers"
import { FC, useMemo } from "react"
import { EthSignBodyDefault } from "./EthSignBodyDefault"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import useTokens from "@ui/hooks/useTokens"
import { BalanceFormatter } from "@core/domains/balances"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import { SignAlertMessage } from "./shared/SignAlertMessage"

const ALLOWANCE_UNLIMITED = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

export const EthSignBodyErc20Approve: FC = () => {
  const { account, network, transactionInfo } = useEthSignTransactionRequest()
  const txInfo = transactionInfo as KnownTransactionInfo

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

  const nativeToken = useToken(network?.nativeToken?.id)

  const { spender, allowance, isInfinite } = useMemo(() => {
    const rawAllowance = getContractCallArg(txInfo.contractCall, "_value") as BigNumber
    // console.log({ rawAllowance, ALLOWANCE_UNLIMITED })
    return {
      spender: getContractCallArg(txInfo.contractCall, "_spender"),
      allowance: new BalanceFormatter(rawAllowance.toString(), txInfo.asset.decimals, token?.rates),
      isInfinite: rawAllowance.toHexString() === ALLOWANCE_UNLIMITED,
    }
  }, [token?.rates, txInfo.asset.decimals, txInfo.contractCall])

  if (!nativeToken || !account || !network) return <EthSignBodyShimmer />

  if (txInfo.contractCall.name !== "approve") return <EthSignBodyDefault />

  return (
    <div className="flex h-full flex-col">
      <div className="grow">
        <h1 className="!leading-base !mt-0 font-sans !text-lg !font-bold">
          This app wants to
          <br />
          access your funds
        </h1>
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-start p-1">
            <div>Allow</div>
            <SignParamNetworkAddressButton network={network} address={spender} />
          </div>
          <div className="flex items-start p-1">
            <div>to spend{isInfinite ? " infinite" : ""}</div>
            <SignParamErc20TokenButton
              address={txInfo.targetAddress}
              asset={txInfo.asset}
              network={network}
            />
          </div>
          <div className="flex items-start p-1">
            <div>from</div>
            <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
          </div>
        </div>
        <div className="my-16 text-center">
          <ViewDetailsEth />
        </div>
      </div>
      <SignAlertMessage>
        This contract will have permission to spend tokens on your behalf until manually revoked.{" "}
        <a className="text-white" href="https://revoke.cash/faq" target="_blank">
          Learn more
        </a>
      </SignAlertMessage>
    </div>
  )
}
