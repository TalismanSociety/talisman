import { AMOUNT_BUCKETS, DAY_BUCKETS, SHARE_BUCKETS } from "./buckets"
import { DAPP_METHODS, REQUEST_OUTCOMES, RISK_VERDICTS } from "./dapp"
import { ERROR_CATEGORIES } from "./errorCategory"
import { p } from "./schema"
import { CHAIN_PLATFORMS, SETTLED_STATUSES, SIGNERS, SUBMITTERS, TX_TYPES } from "./transactions"

export const UNLOCK_METHODS = ["password", "quick_unlock"] as const
export const LOCK_REASONS = ["manual", "auto_lock", "error"] as const
export const ERROR_SURFACES = ["toast", "field", "alert", "screen", "boundary"] as const
export const DISMISS_CAUSES = ["escape", "backdrop", "button", "completed"] as const
const TVL_TRIGGERS = ["daily", "update"] as const

export const properties = {
  source: p.enum(["onboarding", "settings"], "Where the user made the choice."),

  $screen_name: p.routePattern(
    "Route pattern of the screen, params as :name, never a value. Set on $screen, and on every event a page sends: the screen shown when it fired."
  ),
  previous_screen_name: p.routePattern("The screen this page showed before, on $screen."),
  previous_dwell_ms: p.durationMs("How long the previous screen of the same page was shown."),

  modal_id: p.slug("Stable id of the modal or drawer: its analyticsId prop."),
  dismiss: p.enum(
    DISMISS_CAUSES,
    "How it closed. escape, backdrop: the user dismissed it with that gesture. completed: the user finished what it was for (a transaction submitted inside it) before it closed. button: any other close, by its own buttons or by code. A close that follows an asynchronous dismiss handler reads button."
  ),
  duration_ms: p.durationMs(
    "Elapsed milliseconds. modal_closed: how long it was open. balances_loaded: from the unlock (or the page load when already unlocked) to balances loaded."
  ),

  surface: p.enum(
    ERROR_SURFACES,
    "Where the error showed: a toast, an inline field error, a sign alert, a blocking error screen, or the crash screen."
  ),
  error_category: p.enum(
    ERROR_CATEGORIES,
    "What kind of failure, never its text. input_invalid: a form field's own validation."
  ),
  flow: p.slug("The flow running when it happened."),
  field: p.slug("The form field the error belongs to: its input name."),

  platform: p.enum(CHAIN_PLATFORMS, "Chain platform, not the OS."),
  network_id: p.slug("Chaindata network id. custom: a network the user added."),
  tx_type: p.enum(
    TX_TYPES,
    "The wallet's transaction kind (txInfo.type). other: a transaction without one, such as staking, Earn and every dapp transaction."
  ),
  signer: p.enum(SIGNERS, "Who signs for the account."),
  submitted_by: p.enum(
    SUBMITTERS,
    "Who asked for the transaction: the wallet's own UI, or a dapp."
  ),
  sign_only: p.bool("The wallet signed it and the dapp broadcasts it."),
  status: p.enum(
    SETTLED_STATUSES,
    "Final status. replaced: another transaction with the same nonce settled. dropped: the chain never saw it."
  ),
  time_to_settle_ms: p.durationMs(
    "From the stored transaction to its final status. The start is set before the broadcast for wallet Polkadot transactions, after it for Ethereum, and at signing for dapp Polkadot and Solana transactions."
  ),

  method: p.enum(
    [...DAPP_METHODS, ...UNLOCK_METHODS],
    "Dapp request events: the method the request answers, connect for every connection request. app_unlocked: how the wallet was unlocked."
  ),
  outcome: p.enum(
    REQUEST_OUTCOMES,
    "approved, rejected: the user decided, or the wallet refused the approval (error_category is then set). closed: the request window closed without a decision, by the user, by ignoring it, or by another request's approval closing every window (a Solana reject closes its window, so it reads closed). expired: the dapp tab closed or navigated away, or the window failed to open."
  ),
  time_to_decision_ms: p.durationMs(
    "From the request reaching the wallet to the decision, or to its end without one. An unlock first is included."
  ),
  risk_verdict: p.enum(
    RISK_VERDICTS,
    "The latest risk scan verdict the request window showed. unscanned: no scan finished, or the request type has none."
  ),
  dapp_domain: p.nullable(
    p.hostname(
      "The dapp's hostname, without port. ipfs or ipns for those schemes. Null when it has none."
    )
  ),
  wallet_locked: p.bool("The wallet was locked when the request arrived, so an unlock came first."),
  site_flagged: p.bool("The site scan had flagged the dapp as malicious when the request arrived."),
  after_unlock: p.bool("The request window showed the unlock screen first."),

  time_to_interactive_ms: p.durationMs(
    "From the popup page starting to load to its first screen painted. The toolbar click is not observable."
  ),
  render_ms: p.durationMs(
    "From the request window starting to load to the request painted. Decoding, fees and the risk scan can still be running."
  ),
  ready_at_unlock: p.bool(
    "Balances had already loaded when the page started measuring, so duration_ms is 0."
  ),

  previous_version: p.slug("The version before the update."),
  lock_reason: p.enum(
    [...LOCK_REASONS, "restart"],
    "Why the wallet was locked before this unlock. restart: the browser or the extension restarted."
  ),
  reason: p.enum(
    LOCK_REASONS,
    "Why the wallet locked. error: a failed key access or Quick Unlock attempt locked it."
  ),
  legacy_password: p.bool("The unlock went through the legacy password path."),

  trigger: p.enum(
    TVL_TRIGGERS,
    "Why it was sent: the daily cadence, or the first unlock after an update."
  ),
  account_count: p.count("Accounts, contacts excluded."),
  local_count: p.count("Accounts whose keys the wallet holds."),
  ledger_count: p.count("Ledger accounts."),
  vault_count: p.count("Polkadot Vault accounts."),
  signet_count: p.count("Signet accounts."),
  watch_count: p.count("Watched accounts."),
  ethereum_count: p.count("Ethereum accounts."),
  polkadot_count: p.count("Polkadot accounts."),
  solana_count: p.count("Solana accounts."),
  recovery_phrase_count: p.count("Recovery phrases."),
  recovery_phrase_unbacked_count: p.count("Recovery phrases never confirmed as backed up."),
  enabled_network_count: p.count("Enabled networks."),
  enabled_network_ids: p.list(
    p.slug("A chaindata network id."),
    "Enabled networks whose native token is on the allow-list, sorted."
  ),
  held_network_ids: p.list(
    p.slug("A chaindata network id."),
    "Allow-listed networks where owned accounts hold at least $1, sorted."
  ),
  held_network_usd_buckets: p.list(
    p.pair(
      p.enum(AMOUNT_BUCKETS, "A USD range."),
      p.slug("A chaindata network id."),
      "A USD range and a network id."
    ),
    "<bucket>|<network id> for each held_network_ids entry, most valuable first."
  ),
  held_token_usd_buckets: p.list(
    p.pair(
      p.enum(AMOUNT_BUCKETS, "A USD range."),
      p.slug("A CoinGecko id."),
      "A USD range and a CoinGecko id."
    ),
    "<bucket>|<CoinGecko id> for allow-listed tokens owned accounts hold at least $1 of, summed across networks, most valuable first."
  ),
  other_token_count: p.count("Tokens held (at least $1) that are not on the allow-list."),
  other_network_count: p.count("Networks held (at least $1) that are not on the allow-list."),
  dust_network_count: p.count("Networks where owned accounts hold more than $0 and less than $1."),
  custom_network_count: p.count("Networks the user added."),
  currency: p.slug("The fiat currency the user picked."),
  portfolio_usd_bucket: p.enum(AMOUNT_BUCKETS, "USD value of owned accounts."),
  watched_usd_bucket: p.enum(AMOUNT_BUCKETS, "USD value of watched accounts."),
  staked_share: p.enum(
    SHARE_BUCKETS,
    "Share of the owned value that is staked: native staking locks, nomination pools and Bittensor stake."
  ),
  stablecoin_share: p.enum(SHARE_BUCKETS, "Share of the owned value held in stablecoins."),
  is_funded: p.bool("Owned accounts hold more than $0."),
  days_since_install: p.enum(
    DAY_BUCKETS,
    "Days since install, as a range. For installs older than this analytics, since the update that brought it. unknown: never recorded."
  ),
  quick_unlock_enabled: p.bool("Quick Unlock is set up."),
} as const
