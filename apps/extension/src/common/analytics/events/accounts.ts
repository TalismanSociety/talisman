import { z } from "zod/v4"

import { ACCOUNT_FLOWS, CREATED_ORIGINS } from "../accounts"
import { properties } from "../properties"
import { defineEventGroup } from "../schema"

const accountFlow = { narrow: z.enum(ACCOUNT_FLOWS) }

export const accountEvents = defineEventGroup(properties, {
  account_created: {
    description:
      "An account the wallet holds the key of was added: one event per account, from any screen.",
    props: {
      origin: { narrow: z.enum(CREATED_ORIGINS) },
      wallet_type: "required",
      is_first_account: "required",
      flow: accountFlow,
    },
  },
  account_watch_added: {
    description: "A watched account was added, from the add account screens or Try Talisman.",
    props: { wallet_type: "required", flow: accountFlow },
  },
  ledger_accounts_imported: {
    description: "Ledger accounts were added, one event per import.",
    props: { count: "required", platform: "required" },
  },
  external_accounts_imported: {
    description: "Polkadot Vault or Signet accounts were added, one event per import.",
    props: {
      account_type: { narrow: z.enum(["vault", "signet"]) },
      count: "required",
      platform: "required",
    },
  },
  onboarding_completed: {
    description:
      "The wallet's first account was added, which ends onboarding as on mobile. The extension's onboarding screens end earlier, with onboarding_setup_completed.",
    props: { origin: "required", wallet_type: "required" },
  },
  account_removed: {
    description: "The user removed an account from the wallet.",
    props: { account_type: "required" },
  },
  item_renamed: {
    description: "The user renamed an account, a folder or a recovery phrase.",
    props: { item: "required", account_type: "optional" },
  },
  account_exported: {
    description:
      "The user exported accounts: one account or all of them as JSON, or a private key.",
    props: { format: "required" },
  },
  watched_account_portfolio_toggled: {
    description: "The user changed whether a watched account counts in the portfolio.",
    props: { in_portfolio: "required" },
  },
  folder_created: {
    description: "The user created an account folder.",
    props: { tree: "required" },
  },
  folder_deleted: {
    description: "The user deleted an account folder. Its accounts stay in the list.",
    props: { accounts_in_folder: "required" },
  },
  account_moved: {
    description: "The user dragged an account or a folder to a new place in the account list.",
    props: {
      item: { narrow: z.enum(["account", "folder"]) },
      action: "required",
      tree: "required",
    },
  },
  recovery_phrase_deleted: {
    description: "The user deleted a recovery phrase from the wallet.",
    props: {},
  },
  verifier_certificate_set: {
    description:
      "The user picked the recovery phrase that signs Polkadot Vault network updates, its verifier certificate.",
    props: { origin: { narrow: z.enum(["seed", "existing_seed"]) } },
  },
  quick_unlock_disabled: {
    description: "The user turned Quick Unlock off in settings.",
    props: {},
  },
})
