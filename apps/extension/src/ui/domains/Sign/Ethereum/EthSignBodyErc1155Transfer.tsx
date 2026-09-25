import { useQuery } from "@tanstack/react-query"
import { UnsafeImage } from "@ui/components/UnsafeImage"
import { getNftMetadata } from "@ui/util/getNftMetadata"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

export const EthSignBodyErc1155Transfer: FC = () => {
  const { t } = useTranslation()
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const asset = decodedTx.asset as { tokenURI?: string; name?: string } | undefined

  const qMetadata = useQuery({
    queryKey: [asset?.tokenURI],
    queryFn: () => getNftMetadata(asset?.tokenURI, 96, 96),
  })

  const { from, to, tokens } = useMemo(() => {
    const isBatch = decodedTx.contractCall?.functionName === "safeBatchTransferFrom"
    const tokenIds = isBatch
      ? getContractCallArg<bigint[]>(decodedTx, "ids")
      : [getContractCallArg<bigint>(decodedTx, "id")]
    const amounts = isBatch
      ? getContractCallArg<bigint[]>(decodedTx, "amounts")
      : [getContractCallArg<bigint>(decodedTx, "amount")]

    return {
      from: getContractCallArg<string>(decodedTx, "from"),
      to: getContractCallArg<string>(decodedTx, "to"),
      tokens: tokenIds.map((tokenId, index) => ({ tokenId, amount: amounts[index] })),
    }
  }, [decodedTx])

  const { name, image } = useMemo(
    () => ({
      name: qMetadata?.data?.name ?? asset?.name,
      image: qMetadata?.data?.image,
    }),
    [asset?.name, qMetadata?.data?.image, qMetadata?.data?.name]
  )

  const isOnBehalf = useMemo(
    () => account && from && account.address.toLowerCase() !== from.toLowerCase(),
    [account, from]
  )

  if (qMetadata.isLoading || !from || !to || !account || !network || !decodedTx.targetAddress)
    return <SignViewBodyShimmer />

  return (
    <SignContainer networkType="ethereum" title={t("NFT Transfer Request")}>
      <div className="flex">
        <div>{t("Transfer")}</div>
        <SignParamNetworkAddressButton
          address={decodedTx.targetAddress}
          network={network}
          name={name}
        />
      </div>
      {tokens.map(({ tokenId, amount }) => (
        <div key={tokenId.toString()}>
          {t("{{amount}} × #{{tokenId}}", {
            amount: amount?.toString(),
            tokenId: tokenId.toString(),
          })}
        </div>
      ))}
      <div className="flex max-w-full overflow-hidden">
        <div className="whitespace-nowrap">{t("from")}</div>
        <SignParamAccountButton address={from} />
      </div>
      <div className="flex">
        <div>{t("to")}</div>
        <SignParamAccountButton address={to} explorerUrl={network.blockExplorerUrls[0]} withIcon />
      </div>
      {isOnBehalf && (
        <div className="flex max-w-full overflow-hidden">
          <div className="whitespace-nowrap">{t("with")}</div>
          <SignParamAccountButton address={account.address} />
        </div>
      )}
      {!!image && (
        <div className="mt-12 -mb-4 text-center">
          <UnsafeImage
            className="inline-block h-48 w-48 rounded bg-grey-800"
            src={image}
            alt={name}
          />
        </div>
      )}
    </SignContainer>
  )
}
