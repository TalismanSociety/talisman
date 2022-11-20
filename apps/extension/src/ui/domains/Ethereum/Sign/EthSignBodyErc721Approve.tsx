import { FC, useMemo } from "react"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignAlertMessage, SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { EthSignContainer } from "./shared/EthSignContainer"
import { BigNumber } from "ethers"
import { useQuery } from "@tanstack/react-query"
import { UnsafeImage } from "talisman-ui"
import { getNftMetadata } from "@core/util/getNftMetadata"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

export const EthSignBodyErc721Approve: FC = () => {
  const { account, network, transactionInfo } = useEthSignTransactionRequest()
  const txInfo = transactionInfo as KnownTransactionInfo
  const qMetadata = useQuery({
    queryKey: [txInfo.asset?.tokenURI],
    queryFn: () => getNftMetadata(txInfo.asset?.tokenURI, 96, 96),
  })

  const { operator, approve, tokenId } = useMemo(() => {
    const operator = getContractCallArg(txInfo.contractCall, "operator")
    return {
      operator: getContractCallArg(txInfo.contractCall, "operator"),
      approve: operator !== ZERO_ADDRESS,
      tokenId: BigNumber.from(getContractCallArg(txInfo.contractCall, "tokenId")),
    }
  }, [txInfo.contractCall])

  const { name, image } = useMemo(
    () => ({
      name: qMetadata?.data?.name ?? `${txInfo?.asset?.name} #${tokenId.toNumber()}`,
      image: qMetadata?.data?.image,
    }),
    [qMetadata?.data?.image, qMetadata?.data?.name, tokenId, txInfo?.asset?.name]
  )

  if (qMetadata.isLoading || !operator || !account || !network) return <EthSignBodyShimmer />

  return (
    <EthSignContainer
      title={<>{approve ? "NFT Approval Request" : "Revoke NFT Approval Request"}</>}
      alert={
        approve ? (
          <SignAlertMessage>
            <span className="text-body-secondary">
              This contract will have permission to transfer this NFT on your behalf until manually
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
        ) : null
      }
    >
      <div className="flex">
        <div>{approve ? "Allow" : "Disallow"}</div>
        <SignParamNetworkAddressButton network={network} address={operator} />
      </div>
      <div className="flex">
        <div>to transfer</div>
        <SignParamNetworkAddressButton
          address={txInfo.targetAddress}
          network={network}
          name={name}
        />
      </div>
      <div className="flex max-w-full overflow-hidden">
        <div className="whitespace-nowrap">on behalf of</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
      {!!image && (
        <div className="mt-12 mb-[-0.8rem] text-center">
          <UnsafeImage
            className="bg-grey-800 inline-block h-48 w-48 rounded"
            src={image}
            alt={name}
          />
        </div>
      )}
    </EthSignContainer>
  )
}
