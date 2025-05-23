import {
  Account,
  isAccountEthereum,
  isAccountEthereumSigner,
  isAccountInTypes,
  isAccountNotContact,
  isAccountOfType,
  isAccountSs58,
  ProviderType,
} from "extension-core"
import { isTalismanUrl } from "extension-shared"
import { useMemo } from "react"

import { useAccounts, useSettingValue } from "@ui/state"

export const useInjectableAccounts = (siteUrl: string, provider?: ProviderType) => {
  const isTalismanSite = isTalismanUrl(siteUrl)
  const isDevMode = useSettingValue("developerMode")
  const accounts = useAccounts()

  const providerCompatibleAccounts = useMemo<Account[]>(() => {
    switch (provider) {
      case "polkadot":
        return accounts
          .filter((account) => !isAccountOfType(account, "ledger-ethereum")) // ledger-ethereum cant sign a tx payload, despite its address being supported by some chains
          .filter((account) => isAccountEthereum(account) || isAccountSs58(account))
      case "ethereum":
        return accounts.filter(isAccountEthereumSigner) // all accounts with an ethereum address, except ledger-polkadot
      default:
        return accounts
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
