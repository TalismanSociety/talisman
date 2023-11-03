import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArgOld } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

export const EthSignBodyErc721ApproveAll: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { operator, approve } = useMemo(() => {
    return {
      operator: getContractCallArgOld<string>(transactionInfo.contractCall, "operator"),
      approve: getContractCallArgOld<boolean>(transactionInfo.contractCall, "approved"),
    }
  }, [transactionInfo.contractCall])

  if (!operator || !account || !network) return <SignViewBodyShimmer />

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
            <a
              className="text-white"
              href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/ethereum-features/token-approvals"
              target="_blank"
            >
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
        <div>{t("to transfer all")}</div>
        <SignParamNetworkAddressButton
          address={transactionInfo.targetAddress}
          network={network}
          name={transactionInfo.asset?.name}
        />
      </div>
      <div className="flex">
        <div>{t("NFTs from")}</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
    </SignContainer>
  )
}
