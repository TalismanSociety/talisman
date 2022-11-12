import { FC, useMemo } from "react"
import { EthSignBodyDefault } from "./EthSignBodyDefault"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { EthSignContainer } from "./shared/EthSignContainer"
import { BigNumber } from "ethers"
import { useQuery } from "@tanstack/react-query"
import { UnsafeImage } from "talisman-ui"

const getSafeDownloadUrl = (url: string) =>
  url ? url.replace(/^ipfs:\/\//, "https://cf-ipfs.com/ipfs/") : url

export const getNftMetadata = async (metadataUri?: string) => {
  if (!metadataUri) return null

  try {
    const fetchMetadata = await fetch(getSafeDownloadUrl(metadataUri))
    const { name, description, image } = await fetchMetadata.json()
    return {
      name,
      description,
      image: getSafeDownloadUrl(image),
    }
  } catch (err) {
    // failed, ignore
    return null
  }
}

export const EthSignBodyErc721Approve: FC = () => {
  const { account, network, transactionInfo } = useEthSignTransactionRequest()
  const txInfo = transactionInfo as KnownTransactionInfo
  const qMetadata = useQuery({
    queryKey: [txInfo.asset?.tokenURI],
    queryFn: () => getNftMetadata(txInfo.asset?.tokenURI),
  })

  const { operator, tokenId } = useMemo(() => {
    return {
      operator: getContractCallArg(txInfo.contractCall, "operator"),
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

  if (txInfo.contractCall.name !== "approve") return <EthSignBodyDefault />

  return (
    <EthSignContainer title={<>NFT Approval Request</>}>
      <div className="flex">
        <div>Allow</div>
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
        <div className="mt-16 mb-[-1.2rem] text-center">
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
