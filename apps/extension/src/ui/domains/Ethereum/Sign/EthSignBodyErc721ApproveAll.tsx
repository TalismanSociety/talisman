import { FC, useMemo } from "react"

import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { EthSignContainer } from "./shared/EthSignContainer"
import { SignAlertMessage } from "./shared/SignAlertMessage"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

export const EthSignBodyErc721ApproveAll: FC = () => {
  const { account, network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { operator, approve } = useMemo(() => {
    return {
      operator: getContractCallArg<string>(transactionInfo.contractCall, "operator"),
      approve: getContractCallArg<boolean>(transactionInfo.contractCall, "approved"),
    }
  }, [transactionInfo.contractCall])

  if (!operator || !account || !network) return <EthSignBodyShimmer />

  return (
    <EthSignContainer
      title={<>{approve ? "NFT Approval Request" : "Revoke NFT Approval Request"}</>}
      alert={
        approve && (
          <SignAlertMessage>
            <span className="text-body-secondary">
              This contract will have permission to transfer all NFTs from this collection on your
              behalf until manually revoked.
            </span>{" "}
            <a
              className="text-white"
              href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/ethereum-features/token-approvals"
              target="_blank"
            >
              Learn more
            </a>
          </SignAlertMessage>
        )
      }
    >
      <div className="flex">
        <div>{approve ? "Allow" : "Disallow"}</div>
        <SignParamNetworkAddressButton network={network} address={operator} />
      </div>
      <div className="flex">
        <div>to transfer all</div>
        <SignParamNetworkAddressButton
          address={transactionInfo.targetAddress}
          network={network}
          name={transactionInfo.asset?.name}
        />
      </div>
      <div className="flex">
        <div>NFTs from</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
    </EthSignContainer>
  )
}
