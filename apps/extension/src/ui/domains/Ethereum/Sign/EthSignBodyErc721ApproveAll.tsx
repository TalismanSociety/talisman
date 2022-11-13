import { FC, useMemo } from "react"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { SignAlertMessage } from "./shared/SignAlertMessage"
import { EthSignContainer } from "./shared/EthSignContainer"

export const EthSignBodyErc721ApproveAll: FC = () => {
  const { account, network, transactionInfo } = useEthSignTransactionRequest()
  const txInfo = transactionInfo as KnownTransactionInfo

  const { operator, approved } = useMemo(() => {
    return {
      operator: getContractCallArg<string>(txInfo.contractCall, "operator"),
      approved: getContractCallArg<boolean>(txInfo.contractCall, "approved"),
    }
  }, [txInfo.contractCall])

  if (!operator || !account || !network) return <EthSignBodyShimmer />

  return (
    <EthSignContainer
      title={
        <>
          {approved ? "" : "Revoke "}
          NFT Approval Request
        </>
      }
      bottom={
        <SignAlertMessage>
          This contract will have permission to transfer all NFTs from this collection on your
          behalf until manually revoked.{" "}
          <a className="text-white" href="https://revoke.cash/faq" target="_blank">
            Learn more
          </a>
        </SignAlertMessage>
      }
    >
      <div className="flex">
        <div>{approved ? "Allow" : "Disallow"}</div>
        <SignParamNetworkAddressButton network={network} address={operator} />
      </div>
      <div className="flex">
        <div>to transfer</div>
        <SignParamNetworkAddressButton
          address={txInfo.targetAddress}
          network={network}
          name={txInfo.asset?.name}
        />
      </div>
      <div className="flex">
        <div>NFTs from</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
    </EthSignContainer>
  )
}
