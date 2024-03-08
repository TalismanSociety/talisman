import { TOKEN_APPROVALS_URL } from "@extension/shared"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

export const EthSignBodyErc721ApproveAll: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const { operator, approve } = useMemo(() => {
    return {
      operator: getContractCallArg<string>(decodedTx, "operator"),
      approve: getContractCallArg<boolean>(decodedTx, "approved"),
    }
  }, [decodedTx])

  if (!operator || !account || !network || !decodedTx.targetAddress) return <SignViewBodyShimmer />

  return (
    <SignContainer
      networkType="ethereum"
      title={<>{approve ? "NFT Approval Request" : "Revoke NFT Approval Request"}</>}
      alert={
        approve && (
          <SignAlertMessage>
            <span className="text-body-secondary">
              {t(
                "This contract will have permission to transfer all NFTs from this collection on your behalf until manually revoked."
              )}
            </span>{" "}
            <a className="text-white" href={TOKEN_APPROVALS_URL} target="_blank">
              {t("Learn more")}
            </a>
          </SignAlertMessage>
        )
      }
    >
      <div className="flex">
        <div>{approve ? t("Allow") : t("Disallow")}</div>
        <SignParamNetworkAddressButton network={network} address={operator} />
      </div>
      <div className="flex">
        <div className="shrink-0">{t("to transfer all")}</div>
        <SignParamNetworkAddressButton
          address={decodedTx.targetAddress}
          network={network}
          name={decodedTx.asset?.name}
        />
      </div>
      <div className="flex">
        <div>{t("NFTs from")}</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
    </SignContainer>
  )
}
