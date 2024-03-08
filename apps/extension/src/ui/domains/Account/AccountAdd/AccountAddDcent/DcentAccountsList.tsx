import { log } from "@extension/shared"
import { AlertCircleIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import useTokens from "@ui/hooks/useTokens"
import { useDcentAccountInfo } from "@ui/util/dcent"
import { isSubToken } from "@ui/util/isSubToken"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { DcentAccountRow } from "./DcentAccountRow"
import { DcentAccountInfo, getDcentCoinTypeFromToken } from "./util"

const useAccountInfos = () => {
  const { tokens } = useTokens({ activeOnly: true, includeTestnets: true })
  const { data: accounts, isLoading, error } = useDcentAccountInfo()

  // a dcent account entry is 1 token for 1 address
  // group them by address to match talisman accounts structure
  const accountInfos = useMemo(() => {
    return accounts?.account.reduce((result, account) => {
      const token = tokens.find(
        (t) =>
          t.dcentName === account.coin_name ||
          (t.type === "evm-erc20" && t.contractAddress.toUpperCase().startsWith(account.coin_name))
      )
      if (token) {
        const coinType = getDcentCoinTypeFromToken(token)
        if (coinType) {
          const existing = result.find(
            (r) => r.coinType === coinType && r.derivationPath === account.address_path
          )
          if (existing) existing.tokens[account.label] = token
          else
            result.push({
              name: `D'CENT ${isSubToken(token) ? "Polkadot" : "Ethereum"} ${
                result.filter((r) => r.coinType === coinType).length + 1
              }`,
              coinType,
              derivationPath: account.address_path,
              tokens: { [account.label]: token },
            })
        }
      } else log.warn("Unsupported account", account)

      return result
    }, [] as DcentAccountInfo[])
  }, [accounts?.account, tokens])

  return { accountInfos, isLoading, error }
}

export const DcentAccountsList = () => {
  const { t } = useTranslation("admin")
  const { accountInfos, isLoading, error } = useAccountInfos()

  if (isLoading)
    return (
      <div className="text-body-secondary bg-grey-800 flex h-[6rem] items-center gap-6 rounded px-8">
        <LoaderIcon className="animate-spin-slow shrink-0 text-lg" />
        <div>{t("Connecting to D'CENT Biometric Wallet")}</div>
      </div>
    )

  if (error || !accountInfos)
    return (
      <div className="text-alert-warn bg-grey-800 flex h-[6rem] items-center gap-6 rounded px-8">
        <AlertCircleIcon className="shrink-0 text-lg" />
        <div>{error?.message ?? "Failed to fetch accounts from D'CENT Biometric Wallet"}</div>
      </div>
    )

  if (!accountInfos.length)
    return (
      <div className="text-body-secondary bg-grey-800 flex h-[6rem] items-center gap-6 rounded px-8">
        <InfoIcon className="shrink-0 text-lg" />
        <div>
          {t(
            "No accounts found for tokens supported by Talisman. Please use the D'CENT Wallet mobile app to create one."
          )}
        </div>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      {accountInfos.map((accountInfo) => (
        <DcentAccountRow
          key={`${accountInfo.coinType}-${accountInfo.derivationPath}`}
          accountInfo={accountInfo}
        />
      ))}
    </div>
  )
}
