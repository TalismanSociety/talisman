import { EvmAddress } from "@extension/core"
import { TOKEN_APPROVALS_URL, log } from "@extension/shared"
import { notify } from "@talisman/components/Notifications"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import {
  ERC20_UNLIMITED_ALLOWANCE,
  SignParamAllowanceButton,
} from "./shared/SignParamAllowanceButton"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

export const EthSignBodyErc20Approve: FC = () => {
  const { t } = useTranslation("request")
  const { account, network, decodedTx, updateCallArg } = useEthSignKnownTransactionRequest()

  const erc20Token = useMemo(
    () =>
      network && decodedTx.asset?.symbol && decodedTx.targetAddress
        ? {
            evmNetworkId: network.id,
            contractAddress: decodedTx.targetAddress,
            decimals: decodedTx.asset.decimals,
            symbol: decodedTx.asset.symbol,
          }
        : null,
    [decodedTx, network]
  )

  const [spender, allowance] = useMemo(
    () => [
      getContractCallArg<EvmAddress>(decodedTx, "spender"),
      getContractCallArg<bigint>(decodedTx, "amount"),
    ],
    [decodedTx]
  )

  const isRevoke = useMemo(() => allowance === 0n, [allowance])

  const handleAllowanceChange = useCallback(
    async (limit: bigint) => {
      try {
        await updateCallArg("amount", limit)
      } catch (err) {
        log.error("Failed to override allowance", { err })
        notify({ title: "Error", subtitle: (err as Error).message, type: "error" })
      }
    },
    [updateCallArg]
  )

  if (!spender || !account || !network || !erc20Token) return <SignViewBodyShimmer />

  return (
    <SignContainer
      networkType="ethereum"
      title={
        isRevoke ? (
          t("Revoke access")
        ) : (
          <Trans t={t}>
            This app wants to
            <br />
            access your funds
          </Trans>
        )
      }
      alert={
        isRevoke ? null : (
          <SignAlertMessage>
            <span className="text-body-secondary">
              {allowance === ERC20_UNLIMITED_ALLOWANCE
                ? t(
                    `This contract will have permission to spend all tokens on your behalf until manually revoked. We recommend you set a limit by clicking the amount button above.`
                  )
                : t(
                    "This contract will have permission to spend tokens on your behalf until manually revoked."
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
        <div>{isRevoke ? t("Disallow") : t("Allow")}</div>
        <SignParamNetworkAddressButton network={network} address={spender} />
      </div>
      <div className="flex items-center">
        <div>{isRevoke ? t("from spending") : t("to spend")}</div>
        {!isRevoke && (
          <SignParamAllowanceButton
            allowance={allowance}
            token={erc20Token}
            spender={spender}
            onChange={handleAllowanceChange}
          />
        )}
        <SignParamErc20TokenButton
          address={erc20Token.contractAddress}
          asset={erc20Token}
          network={network}
          withIcon
        />
      </div>
      <div className="flex">
        <div>{t("from")}</div>
        <SignParamAccountButton address={account.address} explorerUrl={network.explorerUrl} />
      </div>
    </SignContainer>
  )
}
