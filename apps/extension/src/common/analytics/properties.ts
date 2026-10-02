import { ACCOUNT_METHODS, ACCOUNT_MOVES, ACCOUNT_ORIGINS, ACCOUNT_TREES } from "./accounts"
import { AMOUNT_BUCKETS, DAY_BUCKETS, SHARE_BUCKETS } from "./buckets"
import { DAPP_METHODS, PROTECTION_SOURCES, REQUEST_OUTCOMES, RISK_VERDICTS } from "./dapp"
import { ERROR_CATEGORIES } from "./errorCategory"
import {
  FEE_PRIORITIES,
  GAS_TYPES,
  RAMP_DIRECTIONS,
  RAMP_PROVIDERS,
  RECIPIENT_SOURCES,
  REPLACE_TYPES,
  SWAP_OUTCOMES,
  SWAP_PROTOCOLS,
  TX_PHASES,
} from "./funds"
import { p } from "./schema"
import { CHAIN_PLATFORMS, SETTLED_STATUSES, SIGNERS, SUBMITTERS, TX_TYPES } from "./transactions"

export const UNLOCK_METHODS = ["password", "quick_unlock"] as const
export const LOCK_REASONS = ["manual", "auto_lock", "error"] as const
/** Mobile's `app_unlock_failed` reasons. */
export const UNLOCK_FAILURES = ["rejected", "error"] as const
export const ERROR_SURFACES = ["toast", "field", "alert", "screen", "boundary"] as const
export const DISMISS_CAUSES = ["escape", "backdrop", "button", "completed"] as const
const TVL_TRIGGERS = ["daily", "update"] as const
const ABANDON_CAUSES = ["left", "page_closed"] as const

export const properties = {
  source: p.enum(
    ["onboarding", "settings", "send", "address_book", "dapp"],
    "Where the user made the choice. contact_added: the screen the contact was saved from. Network and token events: dapp when the user approved a dapp's request to add it."
  ),

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
    "Elapsed milliseconds. modal_closed: how long it was open. balances_loaded: from the unlock (or the page load when already unlocked) to balances loaded. Flow events: since the flow's started event."
  ),

  surface: p.enum(
    ERROR_SURFACES,
    "Where the error showed: a toast, an inline field error, a sign alert, a blocking error screen, or the crash screen."
  ),
  error_category: p.enum(
    ERROR_CATEGORIES,
    "What kind of failure, never its text. input_invalid: a form field's own validation. clipboard: the browser refused a copy. A flow's abandoned event: the last error the user saw during the attempt, if any."
  ),
  flow: p.slug(
    "The flow running when it happened. Account events: onboarding for the wallet's first account, add_account for the others, as on mobile."
  ),
  flow_id: p.slug(
    "Random id of one attempt at a flow, a UUID with dashes. Every event of the attempt carries it. error_shown: the attempt running when the error showed."
  ),
  step: p.slug("The flow step the user reached, as the flow defines it."),
  last_step: p.slug(
    "The step the attempt was on: the last step_viewed, or the screen a screen-backed step matches."
  ),
  entry: p.slug("Where the user started the flow from. Each flow lists its own values."),
  abandon_cause: p.enum(
    ABANDON_CAUSES,
    "How the attempt ended unfinished. left: the user closed its modal or navigated away inside the page. page_closed: the page itself went away (the popup or tab closed, or it reloaded)."
  ),
  verified: p.bool(
    "The user proved the backup by picking the recovery phrase's words in order. false: they skipped the check."
  ),
  field: p.slug("The form field the error belongs to: its input name."),

  platform: p.enum(CHAIN_PLATFORMS, "Chain platform, not the OS."),
  network_id: p.slug(
    "Chaindata network id. custom: a network the user added. generic: an address copied in no network's format."
  ),
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
    "Final status of the transaction on chain. replaced: another transaction with the same nonce settled. dropped: the chain never saw it."
  ),
  time_to_settle_ms: p.durationMs(
    "From the stored transaction to its final status. The start is set before the broadcast for wallet Polkadot transactions, after it for Ethereum, and at signing for dapp Polkadot and Solana transactions. swap_completed: until the exchange's final status when the wallet watched one."
  ),

  method: p.enum(
    [...DAPP_METHODS, ...UNLOCK_METHODS, ...ACCOUNT_METHODS],
    "Dapp request events: the method the request answers, connect for every connection request. app_unlocked: how the wallet was unlocked. add_account events: how the user adds the account, once they picked it."
  ),
  outcome: p.enum(
    REQUEST_OUTCOMES,
    "approved, rejected: the user decided, or the wallet refused the approval (error_category is then set). closed: the request window closed without a decision, by the user, by ignoring it, or by another request's approval closing every window. expired: the dapp tab closed or navigated away, or the window failed to open."
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
    [...LOCK_REASONS, "rejected"],
    "app_locked: why the wallet locked, error when a failed key access or Quick Unlock attempt locked it. app_unlock_failed: rejected when the password or the user refused it, error for any other failure."
  ),
  legacy_password: p.bool("The unlock went through the legacy password path."),

  trigger: p.enum(
    TVL_TRIGGERS,
    "Why it was sent: the daily cadence, or the first unlock after an update."
  ),
  account_count: p.count(
    "Accounts, contacts excluded. Dapp connection events: the accounts the dapp can now see through that provider."
  ),
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

  biometrics_offered: p.bool(
    "The setup offered biometric unlock. Always false in the extension, which offers Quick Unlock only in settings."
  ),
  origin: p.enum(
    ACCOUNT_ORIGINS,
    "Where the account's key comes from. seed: a recovery phrase created or typed in now. existing_seed: a recovery phrase the wallet already held. vault: Polkadot Vault."
  ),
  wallet_type: p.enum(CHAIN_PLATFORMS, "The chain platform of the account, as mobile names it."),
  is_first_account: p.bool("The wallet held no account before this one, contacts aside."),
  count: p.count("How many accounts the import added."),
  account_type: p.enum(SIGNERS, "Who signs for the account: the kind of account."),
  item: p.enum(
    ["account", "folder", "recovery_phrase"],
    "What the user renamed. recovery_phrase is the extension's own."
  ),
  format: p.enum(["json", "private_key"], "What the export wrote out."),
  in_portfolio: p.bool("The watched account now counts in the portfolio total."),
  tree: p.enum(ACCOUNT_TREES, "The account list the folder or account is in."),
  accounts_in_folder: p.count("Accounts the folder held when it was deleted."),
  action: p.enum(
    ACCOUNT_MOVES,
    "How a drag in the account list changed the item's folder. reordered: the same folder or the top level."
  ),

  token_symbol: p.symbol(
    "Symbol of the token sent, bought, added or turned on. unknown: a symbol the catalogue cannot hold."
  ),
  send_max: p.bool("The user sent the whole transferable balance with Max."),
  usd_bucket: p.enum(AMOUNT_BUCKETS, "USD value of the amount sent or swapped, as a range."),
  fee_usd_bucket: p.enum(
    AMOUNT_BUCKETS,
    "USD value of the network fee estimated on the confirm screen, as a range."
  ),
  fee_priority: p.enum(
    FEE_PRIORITIES,
    "The EVM fee priority. Absent on networks without a fee choice. custom: the user set the gas values."
  ),
  gas_type: p.enum(GAS_TYPES, "How the EVM network prices gas."),
  recipient_source: p.enum(
    RECIPIENT_SOURCES,
    "How the user picked the recipient. typed: an address entered in the search field, typed or pasted. prefilled: the send opened with a recipient. unknown: none of these was seen."
  ),
  phase: p.enum(
    TX_PHASES,
    "Where the transaction failed. pre_broadcast: before any node accepted it. approval: the token approval a swap needs first. submit: the swap transaction itself."
  ),
  protocol: p.enum(SWAP_PROTOCOLS, "The swap provider."),
  protocols: p.list(p.enum(SWAP_PROTOCOLS, "A swap provider."), "Providers that returned a quote."),
  quote_count: p.count("Quotes returned by every provider together."),
  latency_ms: p.durationMs("From asking every provider for a quote to the last one answering."),
  from_network_id: p.slug(
    "Chaindata network id of the token swapped from. custom: a network the user added."
  ),
  to_network_id: p.slug(
    "Chaindata network id of the token swapped to. custom: a network the user added."
  ),
  from_symbol: p.symbol("Symbol of the token swapped from."),
  to_symbol: p.symbol("Symbol of the token swapped to."),
  cross_chain: p.bool("The swap moves value from one network to another."),
  slippage_percent: p.nullable(
    p.number(
      "The slippage tolerance in percent. Null when the provider takes no slippage setting.",
      {
        min: 0,
        max: 100,
      }
    )
  ),
  slippage_is_default: p.nullable(
    p.bool("slippage_percent is the wallet's default. Null with slippage_percent.")
  ),
  swap_status: p.enum(
    SWAP_OUTCOMES,
    "The exchange's final status, when the wallet watched one. unknown: the wallet stopped watching without one. Absent when the transaction itself did not succeed."
  ),
  stage: p.slug("The step the user left the swap on: mobile's name for last_step."),
  prefill_from_token: p.bool("The swap opened with the token to swap from already picked."),
  is_revoke: p.bool("The approval resets an existing allowance to zero, as some tokens require."),
  replace_type: p.enum(REPLACE_TYPES, "How the user replaced a pending transaction."),
  tab: p.enum(RAMP_DIRECTIONS, "The buy and sell tab the modal opened on."),
  direction: p.enum(RAMP_DIRECTIONS, "Whether the user went on to buy or to sell crypto."),
  provider: p.enum(RAMP_PROVIDERS, "The ramp provider the user went on to."),
  fiat_currency: p.slug("The fiat currency code the user picked, such as USD."),
  address_format: p.slug(
    "<encoding>:<format> of the copied address, as mobile. encoding: ss58, ethereum or base58solana. format: standard, or legacy for an old network prefix."
  ),
  has_network: p.bool("The contact is limited to one network."),
  name_service: p.bool("The address came from a name service lookup."),

  protection_source: p.enum(
    PROTECTION_SOURCES,
    "Which check flagged the site: the community phishing lists, or Blockaid's site scan."
  ),
  mode: p.enum(
    ["add", "edit"],
    "custom_network_saved: whether the user added or edited the network."
  ),
  testnet: p.bool("The network is a testnet."),
  rpc_provider: p.nullable(
    p.hostname(
      "The registrable domain of the network's first RPC, such as alchemy.com. Null for a self-hosted node: an IP address, localhost or a private-network name."
    )
  ),
  enabled: p.bool("The network or token is now turned on."),
  default_enabled: p.bool("The network or token is on by default, when the user has not set it."),
  has_coingecko_id: p.bool("The token has a CoinGecko id, so the wallet can price it."),
} as const
