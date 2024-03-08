import { TOKEN_APPROVALS_URL } from "@extension/shared"
import { useQuery } from "@tanstack/react-query"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { getNftMetadata } from "@ui/util/getNftMetadata"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { UnsafeImage } from "talisman-ui"

import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

export const EthSignBodyErc721Approve: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const asset = decodedTx.asset as { name?: string; tokenURI?: string } | undefined

  const qMetadata = useQuery({
    queryKey: [asset?.tokenURI],
    queryFn: () => getNftMetadata(asset?.tokenURI, 96, 96),
  })

  const { operator, approve, tokenId } = useMemo(() => {
    const operator = getContractCallArg(decodedTx, "operator")
    return {
      operator: getContractCallArg(decodedTx, "operator"),
      approve: operator !== ZERO_ADDRESS,
      tokenId: getContractCallArg(decodedTx, "tokenId"),
    }
  }, [decodedTx])

  const { name, image } = useMemo(
    () => ({
      name: qMetadata?.data?.name ?? `${asset?.name} #${tokenId.toString()}`,
      image: qMetadata?.data?.image,
    }),
    [qMetadata?.data?.image, qMetadata?.data?.name, tokenId, asset?.name]
  )

  if (qMetadata.isLoading || !operator || !account || !network || !decodedTx.targetAddress)
    return <SignViewBodyShimmer />

  return (
    <SignContainer
      networkType="ethereum"
      title={<>{approve ? "NFT Approval Request" : "Revoke NFT Approval Request"}</>}
      alert={
        approve ? (
          <SignAlertMessage>
            <span className="text-body-secondary">
              {t(
                "This contract will have permission to transfer this NFT on your behalf until manually revoked."
              )}
            </span>{" "}
            <a className="text-white" href={TOKEN_APPROVALS_URL} target="_blank">
              {t("Learn more")}
            </a>
          </SignAlertMessage>
        ) : null
      }
    >
      <div className="flex">
        <div>{approve ? t("Allow") : t("Disallow")}</div>
        <SignParamNetworkAddressButton network={network} address={operator} />
      </div>
      <div className="flex">
        <div>{t("to transfer")}</div>
        <SignParamNetworkAddressButton
          address={decodedTx.targetAddress}
          network={network}
          name={name}
        />
      </div>
      <div className="flex max-w-full overflow-hidden">
        <div className="whitespace-nowrap">{t("on behalf of")}</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
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
