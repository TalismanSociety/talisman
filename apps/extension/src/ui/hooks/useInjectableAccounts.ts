import type { Account } from "@core/domains/keyring/exports"
import {
  isAccountInTypes,
  isAccountNotContact,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAccountPlatformSolana,
} from "@core/domains/keyring/exports"
import type { ProviderType } from "@core/domains/sitesAuthorised/types"
import { isTalismanUrl } from "@core/util/isTalismanUrl"
import { useAccounts } from "@ui/state/accounts"
import { useSettingValue } from "@ui/state/settings"
import { useMemo } from "react"

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
      (account) => !isAccountInTypes(account, ["contact", "watch-only"])
    )
  }, [isDevMode, isTalismanSite, providerCompatibleAccounts])
}
