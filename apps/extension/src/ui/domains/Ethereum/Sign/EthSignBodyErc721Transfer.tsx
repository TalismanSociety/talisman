import { getNftMetadata } from "@core/util/getNftMetadata"
import { useQuery } from "@tanstack/react-query"
import { BigNumber, BigNumberish } from "ethers"
import { FC, useMemo } from "react"
import { UnsafeImage } from "talisman-ui"

import { SignContainer } from "../../Sign/SignContainer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewBodyShimmer } from "./views/SignViewBodyShimmer"

export const EthSignBodyErc721Transfer: FC = () => {
  const { account, network, transactionInfo } = useEthSignKnownTransactionRequest()

  const qMetadata = useQuery({
    queryKey: [transactionInfo.asset?.tokenURI],
    queryFn: () => getNftMetadata(transactionInfo.asset?.tokenURI, 96, 96),
  })

  const { from, to, tokenId } = useMemo(() => {
    return {
      from: getContractCallArg<string>(transactionInfo.contractCall, "from"),
      to: getContractCallArg<string>(transactionInfo.contractCall, "to"),
      tokenId: BigNumber.from(
        getContractCallArg<BigNumberish>(transactionInfo.contractCall, "tokenId")
      ),
    }
  }, [transactionInfo.contractCall])

  const { name, image } = useMemo(
    () => ({
      name: qMetadata?.data?.name ?? `${transactionInfo?.asset?.name} #${tokenId.toString()}`,
      image: qMetadata?.data?.image,
    }),
    [qMetadata?.data?.image, qMetadata?.data?.name, tokenId, transactionInfo?.asset?.name]
  )

  const isOnBehalf = useMemo(
    () => account && from && account.address.toLowerCase() !== from.toLowerCase(),
    [account, from]
  )

  if (qMetadata.isLoading || !from || !to || !account || !network) return <SignViewBodyShimmer />

  return (
    <SignContainer networkType="ethereum" title={<>NFT Transfer Request</>}>
      <div className="flex">
        <div>Transfer</div>
        <SignParamNetworkAddressButton
          address={transactionInfo.targetAddress}
          network={network}
          name={name}
        />
      </div>
      <div className="flex max-w-full overflow-hidden">
        <div className="whitespace-nowrap">from</div>
        {isOnBehalf ? (
          <SignParamAccountButton address={from} withIcon explorerUrl={from} />
        ) : (
          <SignParamAccountButton address={from} />
        )}
      </div>
      <div className="flex">
        <div>to</div>
        <SignParamAccountButton address={to} explorerUrl={network.explorerUrl} withIcon />
      </div>
      {isOnBehalf && (
        <div className="flex max-w-full overflow-hidden">
          <div className="whitespace-nowrap">with</div>
          <SignParamAccountButton address={account.address} />
        </div>
      )}
      {!!image && (
        <div className="mb-[-0.8rem] mt-12 text-center">
          <UnsafeImage
            className="bg-grey-800 inline-block h-48 w-48 rounded"
            src={image}
            alt={name}
          />
        </div>
      )}
    </SignContainer>
  )
}
