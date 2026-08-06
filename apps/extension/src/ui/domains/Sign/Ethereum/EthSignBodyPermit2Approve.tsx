import { TOKEN_APPROVALS_URL } from "@common/constants"
import type { EvmAddress } from "@core/domains/ethereum/types"
import { formatDecimals } from "@talismn/util"
import { type FC, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { formatUnits } from "viem"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignContainer } from "../SignContainer"
import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { getContractCallArg } from "./getContractCallArg"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { isUnlimitedAllowance } from "./shared/allowance"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

// beyond this the timestamp is out of range for a javascript date: the allowance never expires
const MAX_DATE_SECONDS = 8_640_000_000_000

export const EthSignBodyPermit2Approve: FC = () => {
  const { t } = useTranslation()
  const { account, network, decodedTx } = useEthSignKnownTransactionRequest()

  const asset = decodedTx.asset as
    | { symbol?: string; decimals?: number; tokenAddress?: EvmAddress }
    | undefined

  const { spender, amount, expiration } = useMemo(
    () => ({
      spender: getContractCallArg<EvmAddress>(decodedTx, "spender"),
      amount: getContractCallArg<bigint>(decodedTx, "amount"),
      expiration: getContractCallArg<number>(decodedTx, "expiration"),
    }),
    [decodedTx]
  )

  const isRevoke = amount === 0n
  const isUnlimited = isUnlimitedAllowance(amount)

  const allowance = useMemo(() => {
    if (isUnlimited) return t("Unlimited")
    return asset?.decimals === undefined
      ? amount.toString()
      : formatDecimals(formatUnits(amount, asset.decimals))
  }, [amount, asset?.decimals, isUnlimited, t])

  const expiry = useMemo(
    () => (expiration >= MAX_DATE_SECONDS ? null : new Date(expiration * 1000).toLocaleString()),
    [expiration]
  )

  if (!spender || !account || !network || !asset?.tokenAddress) return <SignViewBodyShimmer />

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
              {expiry
                ? t(
                    "This contract will have permission to spend these tokens on your behalf until {{expiry}}, or until manually revoked.",
                    { expiry }
                  )
                : t(
                    "This contract will have permission to spend these tokens on your behalf until manually revoked."
                  )}
            </span>{" "}
            <a className="text-white" href={TOKEN_APPROVALS_URL} target="_blank" rel="noopener">
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
        {!isRevoke && <span className="px-4 text-white">{allowance}</span>}
        {asset.symbol ? (
          <SignParamErc20TokenButton
            address={asset.tokenAddress}
            asset={asset}
            network={network}
            withIcon
          />
        ) : (
          <SignParamNetworkAddressButton network={network} address={asset.tokenAddress} />
        )}
      </div>
      <div className="flex">
        <div>{t("from")}</div>
        <SignParamAccountButton
          address={account.address}
          explorerUrl={network.blockExplorerUrls[0]}
        />
      </div>
      {!isRevoke && (
        <div className="flex">
          <div>{t("expires")}</div>
          <span className="px-4 text-white">{expiry ?? t("never")}</span>
        </div>
      )}
    </SignContainer>
  )
}
