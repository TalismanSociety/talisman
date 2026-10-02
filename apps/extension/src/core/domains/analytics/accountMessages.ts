import { type AccountOrigin, chainPlatformOf, isCreatedOrigin } from "@common/analytics/accounts"
import { type ChainPlatform, signerOf } from "@common/analytics/transactions"
import { getAccountPlatformFromAddress } from "@talismn/crypto"
import type { Account, AccountType } from "@talismn/keyring"

import type { MessageTypes, RequestTypes, ResponseTypes } from "../../types"
import { keyringStore } from "../keyring/store"
import { track } from "./track"

type AddedAccount = { readonly origin: AccountOrigin; readonly walletType: ChainPlatform }

const reportAccountsAdded = (added: readonly AddedAccount[], hadAccount: boolean) => {
  const [first] = added
  if (!first) return

  const flowAt = (index: number) => (!hadAccount && index === 0 ? "onboarding" : "add_account")
  added.forEach(({ origin, walletType }, index) => {
    if (isCreatedOrigin(origin))
      track("account_created", {
        origin,
        wallet_type: walletType,
        is_first_account: flowAt(index) === "onboarding",
        flow: flowAt(index),
      })
    else if (origin === "watch")
      track("account_watch_added", { wallet_type: walletType, flow: flowAt(index) })
  })
  if (first.origin === "ledger")
    track("ledger_accounts_imported", { count: added.length, platform: first.walletType })
  if (first.origin === "vault" || first.origin === "signet")
    track("external_accounts_imported", {
      account_type: first.origin,
      count: added.length,
      platform: first.walletType,
    })

  if (!hadAccount)
    track("onboarding_completed", { origin: first.origin, wallet_type: first.walletType })
}

const EXTERNAL_ORIGINS: Record<Exclude<AccountType, "keypair" | "contact">, AccountOrigin> = {
  "watch-only": "watch",
  "ledger-polkadot": "ledger",
  "ledger-ethereum": "ledger",
  "ledger-solana": "ledger",
  "polkadot-vault": "vault",
  "signet": "signet",
}

const isAccount = (account: Account) => account.type !== "contact"

const walletTypeOf = (address: string) => chainPlatformOf(getAccountPlatformFromAddress(address))

const observeAdd = (originOf: (index: number, account: Account) => AccountOrigin | null) => {
  const before = keyringStore.getAccounts()
  return async (addresses: string[]) => {
    const [accountsBefore, accountsAfter] = await Promise.all([before, keyringStore.getAccounts()])
    const added = addresses.flatMap((address, index) => {
      const account = accountsAfter.find((candidate) => candidate.address === address)
      const origin = account && originOf(index, account)
      const walletType = walletTypeOf(address)
      return origin && walletType ? [{ origin, walletType }] : []
    })
    reportAccountsAdded(added, accountsBefore.some(isAccount))
  }
}

const observeAccountType = (address: string, report: (type: AccountType) => void) => {
  const before = keyringStore.getAccount(address)
  return async () => {
    const account = await before
    if (account && isAccount(account)) report(account.type)
  }
}

type Contact = Extract<Account, { type: "contact" }>

const observeContact = (address: string, report: (contact: Contact) => void) => {
  const before = keyringStore.getAccount(address)
  return async () => {
    const account = await before
    if (account?.type === "contact") report(account)
  }
}

type AccountMessage =
  | "pri(accounts.add.derive)"
  | "pri(accounts.add.keypair)"
  | "pri(accounts.create.json)"
  | "pri(accounts.add.external)"
  | "pri(accounts.forget)"
  | "pri(accounts.update.contact)"
  | "pri(accounts.rename)"
  | "pri(accounts.export)"
  | "pri(accounts.export.all)"
  | "pri(accounts.export.pk)"
  | "pri(accounts.external.setIsPortfolio)"
  | "pri(mnemonics.rename)"
  | "pri(mnemonics.delete)"
  | "pri(mnemonics.setVerifierCertMnemonic)"
  | "pri(app.quickUnlock.unenroll)"

type Observe<M extends AccountMessage> = (
  request: RequestTypes[M]
) => (response: ResponseTypes[M]) => Promise<void>

const ACCOUNT_MESSAGES: { [M in AccountMessage]: Observe<M> } = {
  "pri(accounts.add.derive)": (options) =>
    observeAdd((index) =>
      options[index]?.type === "existing-mnemonic" ? "existing_seed" : "seed"
    ),
  "pri(accounts.add.keypair)": () => observeAdd(() => "private_key"),
  "pri(accounts.create.json)": () => observeAdd(() => "json"),
  "pri(accounts.add.external)": () =>
    observeAdd((_, account) =>
      account.type === "keypair" || account.type === "contact"
        ? null
        : EXTERNAL_ORIGINS[account.type]
    ),
  "pri(accounts.forget)": ({ address }) => {
    const before = keyringStore.getAccount(address)
    return async () => {
      const account = await before
      if (account?.type === "contact") return track("contact_deleted")
      const accountType = account && signerOf(account.type)
      if (accountType) track("account_removed", { account_type: accountType })
    }
  },
  "pri(accounts.update.contact)": ({ address, genesisHash }) =>
    observeContact(address, (contact) =>
      track("contact_edited", {
        network_changed: (contact.genesisHash ?? null) !== (genesisHash ?? null),
      })
    ),
  "pri(accounts.rename)": ({ address }) =>
    observeAccountType(address, (type) => {
      const accountType = signerOf(type)
      track("item_renamed", { item: "account", ...(accountType && { account_type: accountType }) })
    }),
  "pri(accounts.export)": () => async () => track("account_exported", { format: "json" }),
  "pri(accounts.export.all)": () => async () => track("account_exported", { format: "json" }),
  "pri(accounts.export.pk)": () => async () => track("account_exported", { format: "private_key" }),
  "pri(accounts.external.setIsPortfolio)":
    ({ isPortfolio }) =>
    async () =>
      track("watched_account_portfolio_toggled", { in_portfolio: isPortfolio }),
  "pri(mnemonics.rename)": () => async () => track("item_renamed", { item: "recovery_phrase" }),
  "pri(mnemonics.delete)": () => async () => track("recovery_phrase_deleted"),
  "pri(mnemonics.setVerifierCertMnemonic)": (request) => async () =>
    track("verifier_certificate_set", {
      origin: request.type === "existing" ? "existing_seed" : "seed",
    }),
  "pri(app.quickUnlock.unenroll)": () => async () => track("quick_unlock_disabled"),
}

const isAccountMessage = (type: MessageTypes): type is AccountMessage =>
  Object.hasOwn(ACCOUNT_MESSAGES, type)

export const observeAccountMessage = (
  type: MessageTypes,
  request: unknown
): ((response: unknown) => Promise<void>) | null => {
  if (!isAccountMessage(type)) return null
  const observe = ACCOUNT_MESSAGES[type] as unknown as (
    request: unknown
  ) => (response: unknown) => Promise<void>
  return observe(request)
}
