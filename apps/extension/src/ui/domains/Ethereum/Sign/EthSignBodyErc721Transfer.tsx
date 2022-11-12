import { FC, useMemo } from "react"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { EthSignContainer } from "./shared/EthSignContainer"
import { BigNumber, BigNumberish } from "ethers"
import { useQuery } from "@tanstack/react-query"
import { UnsafeImage } from "talisman-ui"
import { getNftMetadata } from "@core/util/getNftMetadata"

export const EthSignBodyErc721Transfer: FC = () => {
  const { account, network, transactionInfo } = useEthSignTransactionRequest()
  const txInfo = transactionInfo as KnownTransactionInfo
  const qMetadata = useQuery({
    queryKey: [txInfo.asset?.tokenURI],
    queryFn: () => getNftMetadata(txInfo.asset?.tokenURI),
  })

  const { from, to, tokenId } = useMemo(() => {
    return {
      from: getContractCallArg<string>(txInfo.contractCall, "from"),
      to: getContractCallArg<string>(txInfo.contractCall, "to"),
      tokenId: BigNumber.from(getContractCallArg<BigNumberish>(txInfo.contractCall, "tokenId")),
    }
  }, [txInfo.contractCall])

  const { name, image } = useMemo(
    () => ({
      name: qMetadata?.data?.name ?? `${txInfo?.asset?.name} #${tokenId.toNumber()}`,
      image: qMetadata?.data?.image,
    }),
    [qMetadata?.data?.image, qMetadata?.data?.name, tokenId, txInfo?.asset?.name]
  )

  if (qMetadata.isLoading || !to || !account || !network) return <EthSignBodyShimmer />

  return (
    <EthSignContainer title={<>NFT Transfer Request</>}>
      <div className="flex">
        <div>transfer</div>
        <SignParamNetworkAddressButton
          address={txInfo.targetAddress}
          network={network}
          name={name}
        />
      </div>
      <div className="flex max-w-full overflow-hidden">
        <div className="whitespace-nowrap">from</div>
        <SignParamAccountButton address={from} />
      </div>
      <div className="flex">
        <div>to</div>
        <SignParamAccountButton address={to} explorerUrl={network.explorerUrl} withIcon />
      </div>
      {from.toLowerCase() !== account.address.toLowerCase() && (
        <div className="flex max-w-full overflow-hidden">
          <div className="whitespace-nowrap">signing with</div>
          <SignParamAccountButton address={account.address} withIcon />
        </div>
      )}
      {!!image && (
        <div className="mt-12 mb-[-0.8rem] text-center">
          <UnsafeImage
            className="bg-grey-800 inline-block h-48 w-auto rounded"
            src={image}
            alt={name}
          />
        </div>
      )}
    </EthSignContainer>
  )
}
