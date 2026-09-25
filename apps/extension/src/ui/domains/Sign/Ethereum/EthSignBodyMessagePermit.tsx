import { TOKEN_APPROVALS_URL } from "@common/constants"
import type { Account } from "@core/domains/keyring/exports"
import type { EthNetwork } from "@talismn/chaindata-provider"
import { formatDecimals } from "@talismn/util"
import type {
  DecodedTypedDataPermit,
  TypedDataAllowance,
} from "@ui/domains/Ethereum/util/decodeEvmTypedData"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { formatUnits } from "viem"

import { SignAlertMessage } from "../SignAlertMessage"
import { useEvmTokenInfo } from "./hooks/useEvmTokenInfo"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { isUnlimitedAllowance } from "./shared/allowance"
import { getExpiryInfo } from "./shared/expiry"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"

const PermitAllowance: FC<{ allowance: TypedDataAllowance; network: EthNetwork }> = ({
  allowance,
  network,
}) => {
  const { t } = useTranslation()
  const { token, isLoading } = useEvmTokenInfo(network.id, allowance.token)

  const isRevoke = allowance.amount === 0n
  const amount = isUnlimitedAllowance(allowance.amount)
    ? t("Unlimited")
    : token?.decimals !== undefined
      ? formatDecimals(formatUnits(allowance.amount, token.decimals))
      : // without the token's decimals the amount can only be shown in its smallest unit
        isLoading
        ? "…"
        : allowance.amount.toString()

  return (
    <div className="flex items-center">
      <div>{isRevoke ? t("from spending") : t("to spend")}</div>
      {!isRevoke && <span className="px-4 text-white">{amount}</span>}
      {token?.symbol ? (
        <SignParamErc20TokenButton
          address={allowance.token}
          asset={token}
          network={network}
          withIcon
        />
      ) : (
        <SignParamNetworkAddressButton network={network} address={allowance.token} />
      )}
    </div>
  )
}

export const EthSignBodyMessagePermit: FC<{
  account: Account
  network: EthNetwork
  permit: DecodedTypedDataPermit
}> = ({ account, network, permit }) => {
  const { t } = useTranslation()

  // permit2 expires the allowance itself, the other permits only bound their signature's validity.
  // a batch outlives all of its allowances, so it's the last of them that matters
  const expirations = permit.allowances.map((allowance) => allowance.expiration)
  const lastExpiration = expirations.every((expiration) => expiration !== undefined)
    ? expirations.reduce((last, expiration) => (expiration > last ? expiration : last))
    : undefined
  const expiry = getExpiryInfo(lastExpiration ?? permit.deadline)
  const isRevoke = permit.allowances.every((allowance) => allowance.amount === 0n)
  const isUnlimited = permit.allowances.some((allowance) => isUnlimitedAllowance(allowance.amount))

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex w-full flex-col items-center leading-base">
        <div className="flex p-1">
          <div>{isRevoke ? t("Disallow") : t("Allow")}</div>
          <SignParamNetworkAddressButton network={network} address={permit.spender} />
        </div>
        {permit.allowances.map((allowance) => (
          <PermitAllowance
            key={`${allowance.token}-${allowance.amount}`}
            allowance={allowance}
            network={network}
          />
        ))}
        <div className="flex p-1">
          <div>{t("from")}</div>
          <SignParamAccountButton
            address={account.address}
            explorerUrl={network.blockExplorerUrls[0]}
          />
        </div>
        {!isRevoke && (
          <div className="flex p-1">
            <div>{t("expires")}</div>
            <span className="px-4 text-white">
              {expiry.date ? expiry.date.toLocaleString() : t("never")}
            </span>
          </div>
        )}
      </div>
      {!isRevoke && (
        <SignAlertMessage type={isUnlimited || expiry.isFarFuture ? "error" : "warning"}>
          {isUnlimited
            ? t(
                "This signature lets this contract spend all of these tokens on your behalf, with no further approval from you."
              )
            : t(
                "This signature lets this contract spend these tokens on your behalf, with no further approval from you."
              )}{" "}
          {expiry.isPermanent
            ? t("The permission never expires and can only be cancelled on chain.")
            : expiry.isFarFuture
              ? t("The permission lasts for over a year.")
              : null}{" "}
          <a className="text-white" href={TOKEN_APPROVALS_URL} target="_blank" rel="noopener">
            {t("Learn more")}
          </a>
        </SignAlertMessage>
      )}
    </div>
  )
}
