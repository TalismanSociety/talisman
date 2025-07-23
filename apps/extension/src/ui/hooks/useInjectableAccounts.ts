import {
  Account,
  isAccountInTypes,
  isAccountNotContact,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAccountPlatformSolana,
  ProviderType,
} from "extension-core"
import { isTalismanUrl } from "extension-shared"
import { useMemo } from "react"

import { useAccounts, useSettingValue } from "@ui/state"

export const useInjectableAccounts = (siteUrl: string, provider: ProviderType) => {
  const isTalismanSite = isTalismanUrl(siteUrl)
  const isDevMode = useSettingValue("developerMode")
  const accounts = useAccounts()

  const providerCompatibleAccounts = useMemo<Account[]>(() => {
    switch (provider) {
      case "polkadot":
        return accounts.filter(isAccountPlatformPolkadot)
      case "ethereum":
        return accounts.filter(isAccountPlatformEthereum)
      case "solana":
        return accounts.filter(isAccountPlatformSolana)
    }
  }, [accounts, provider])

  return useMemo(() => {
    if (isDevMode) return providerCompatibleAccounts
    if (isTalismanSite) return providerCompatibleAccounts.filter(isAccountNotContact)
    return providerCompatibleAccounts.filter(
      (account) => !isAccountInTypes(account, ["contact", "watch-only"]),
    )
  }, [isDevMode, isTalismanSite, providerCompatibleAccounts])
}
