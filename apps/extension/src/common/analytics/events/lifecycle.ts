import { z } from "zod/v4"

import { LOCK_REASONS, properties, UNLOCK_FAILURES, UNLOCK_METHODS } from "../properties"
import { defineEventGroup } from "../schema"

export const lifecycleEvents = defineEventGroup(properties, {
  app_installed: {
    description:
      "The extension was installed. It fires before consent, so it waits in memory and is sent only if the user opts in while that service worker lives.",
    props: {},
  },
  app_updated: {
    description: "The extension updated to this version.",
    props: { previous_version: "required" },
  },
  app_unlocked: {
    description: "The wallet went from locked to unlocked.",
    props: {
      method: { narrow: z.enum(UNLOCK_METHODS) },
      lock_reason: "required",
      legacy_password: "required",
    },
  },
  app_unlock_failed: {
    description:
      "An unlock attempt failed: a wrong password, or a Quick Unlock that did not complete. A Quick Unlock prompt the wallet opened by itself and the user dismissed is not an attempt.",
    props: {
      method: { narrow: z.enum(UNLOCK_METHODS) },
      reason: { narrow: z.enum(UNLOCK_FAILURES) },
      error_category: "required",
    },
  },
  app_locked: {
    description:
      "The wallet went from unlocked to locked. A browser or extension restart locks it without this event.",
    props: { reason: { narrow: z.enum(LOCK_REASONS) } },
  },
  tvl_snapshot: {
    description:
      "The shape of the wallet in ranges, at most once per 24 h after an unlock once balances are live, and on the first unlock after an update. Tokens and networks off the allow-list (the CoinGecko top 100 that chaindata carries) are only counted. Unlinked: it has an id of its own, no session and its own time shift.",
    unlinked: true,
    props: {
      trigger: "required",
      wallet_account_count: "required",
      local_count: "required",
      ledger_count: "required",
      vault_count: "required",
      signet_count: "required",
      watch_count: "required",
      ethereum_count: "required",
      polkadot_count: "required",
      solana_count: "required",
      recovery_phrase_count: "required",
      recovery_phrase_unbacked_count: "required",
      enabled_network_count: "required",
      enabled_network_ids: "required",
      held_network_ids: "required",
      held_network_usd_buckets: "required",
      held_token_usd_buckets: "required",
      other_token_count: "required",
      other_network_count: "required",
      dust_network_count: "required",
      custom_network_count: "required",
      currency: "required",
      portfolio_usd_bucket: "required",
      watched_usd_bucket: "required",
      staked_share: "required",
      stablecoin_share: "required",
      is_funded: "required",
      days_since_install: "required",
      quick_unlock_enabled: "required",
    },
  },
})
