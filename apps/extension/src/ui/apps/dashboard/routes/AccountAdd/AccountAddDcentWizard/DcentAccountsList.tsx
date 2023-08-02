import { log } from "@core/log"
import { AlertCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import useTokens from "@ui/hooks/useTokens"
import { useDcentAccountInfo } from "@ui/util/dcent"
import { isSubToken } from "@ui/util/isSubToken"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { DcentAccountRow } from "./DcentAccountRow"
import { DCENT_COIN_NAME_TO_TOKEN_ID, DcentAccountInfo, getDcentCoinTypeFromToken } from "./util"

const useAccountInfos = () => {
  const { tokensMap } = useTokens(true)
  const { data: accounts, isLoading, error } = useDcentAccountInfo()

  // a dcent account entry is 1 token for 1 address
  // group them by address to match talisman accounts structure
  const accountInfos = useMemo(() => {
    return accounts?.account.reduce((result, account) => {
      const tokenId = DCENT_COIN_NAME_TO_TOKEN_ID[account.coin_name]
      const token = tokensMap[tokenId]
      if (token) {
        const coinType = getDcentCoinTypeFromToken(token)
        if (coinType) {
          const existing = result.find(
            (r) => r.coinType === coinType && r.derivationPath === account.address_path
          )
          if (existing) existing.tokens.push(token)
          else
            result.push({
              name: `D'CENT ${isSubToken(token) ? "Polkadot" : "Ethereum"} ${
                result.filter((r) => r.coinType === coinType).length + 1
              }`,
              coinType,
              derivationPath: account.address_path,
              tokens: [token],
            })
        }
      } else log.warn("Unsupported account", account)

      return result
    }, [] as DcentAccountInfo[])
  }, [accounts?.account, tokensMap])

  return { accountInfos, isLoading, error }
}

export const DcentAccountsList = () => {
  const { t } = useTranslation("admin")
  const { accountInfos, isLoading, error } = useAccountInfos()

  if (isLoading)
    return (
      <div className="text-body-secondary bg-grey-800 flex h-[6rem] items-center gap-6 rounded px-8">
        <LoaderIcon className="animate-spin-slow text-lg" />
        <div>{t("Connecting to D'CENT Biometric Wallet")}</div>
      </div>
    )

  if (error || !accountInfos?.length)
    return (
      <div className="text-alert-warn bg-grey-800 flex h-[6rem] items-center gap-6 rounded px-8">
        <AlertCircleIcon className="text-lg" />
        <div>{error?.message ?? "Failed to fetch accounts from D'CENT Biometric Wallet"}</div>
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
