import { z } from "zod/v4"

import { ACCOUNT_METHODS, ACCOUNT_MOVES, ACCOUNT_ORIGINS, ACCOUNT_TREES } from "./accounts"
import { AMOUNT_BUCKETS, COUNT_BUCKETS, DAY_BUCKETS, HELD_BUCKETS, SHARE_BUCKETS } from "./buckets"
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
import { ACCOUNT_SELECTIONS, SEARCH_SURFACES } from "./portfolio"
import { type PropertyDef, p } from "./schema"
import { SETTING_ENUM_VALUE, SETTING_KEYS, type SettingValue } from "./settings"
import { EARN_SYSTEMS, STAKING_ACTIONS, STAKING_TYPES, VALIDATOR_SORTS } from "./staking"
import { CHAIN_PLATFORMS, SETTLED_STATUSES, SIGNERS, SUBMITTERS, TX_TYPES } from "./transactions"

export const UNLOCK_METHODS = ["password", "quick_unlock"] as const
export const LOCK_REASONS = ["manual", "auto_lock", "error"] as const
export const UNLOCK_FAILURES = ["rejected", "error"] as const
export const ERROR_SURFACES = ["toast", "field", "alert", "screen", "boundary"] as const
export const DISMISS_CAUSES = ["escape", "backdrop", "button", "completed"] as const
const TVL_TRIGGERS = ["daily", "update"] as const
const ABANDON_CAUSES = ["left", "page_closed"] as const

const range = (description: string) => p.enum(COUNT_BUCKETS, `${description} As a range.`)

const settingValue: PropertyDef<SettingValue> = {
  schema: z
    .union([z.boolean(), z.number().finite(), z.string().regex(SETTING_ENUM_VALUE)])
    .nullable(),
  description:
    "The setting's new value: a boolean, a number, or a short identifier such as a currency code or a sort order. Null when the setting was cleared.",
  posthogType: "String",
}

export const properties = {
  source: p.enum(
    ["onboarding", "settings", "send", "address_book", "dapp"],
    "Where the user made the choice. contact_added: the screen the contact was saved from. Network and token events: dapp when the user approved a dapp's request to add it, settings when they did it in Settings > Networks & Tokens."
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
    [...ERROR_SURFACES, ...SEARCH_SURFACES],
    "error_shown: where the error showed, a toast, an inline field error, a sign alert, a blocking error screen, or the crash screen. search_performed: the search box, by mobile's name where mobile has the same one."
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
    "Chaindata network id. custom: a network the user added, whatever its platform. generic: an address copied in no network's format."
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
    "From the stored transaction to its final status, rounded to the second. The start is set before the broadcast for wallet Polkadot transactions, after it for Ethereum, and at signing for dapp Polkadot and Solana transactions. swap_completed: until the exchange's final status when the wallet watched one."
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
  account_count: p.count("The accounts the dapp can now see through that provider."),
  wallet_account_count: range("Accounts, contacts excluded."),
  local_count: range("Accounts whose keys the wallet holds."),
  ledger_count: range("Ledger accounts."),
  vault_count: range("Polkadot Vault accounts."),
  signet_count: range("Signet accounts."),
  watch_count: range("Watched accounts."),
  ethereum_count: range("Ethereum accounts."),
  polkadot_count: range("Polkadot accounts."),
  solana_count: range("Solana accounts."),
  recovery_phrase_count: range("Recovery phrases."),
  recovery_phrase_unbacked_count: range("Recovery phrases never confirmed as backed up."),
  enabled_network_count: range("Enabled networks."),
  held_network_usd_buckets: p.list(
    p.pair(
      p.enum(HELD_BUCKETS, "A USD range, open above $1M."),
      p.slug("A chaindata network id."),
      "A USD range and a network id."
    ),
    "<bucket>|<network id> for the allow-listed networks where owned accounts hold the most, at least $1 and ten at most, sorted by network id.",
    { maxItems: 10 }
  ),
  held_token_usd_buckets: p.list(
    p.pair(
      p.enum(HELD_BUCKETS, "A USD range, open above $1M."),
      p.slug("A CoinGecko id."),
      "A USD range and a CoinGecko id."
    ),
    "<bucket>|<CoinGecko id> for the allow-listed tokens owned accounts hold the most of, summed across networks, at least $1 and ten at most, sorted by CoinGecko id.",
    { maxItems: 10 }
  ),
  other_token_count: range("Tokens held (at least $1) that are not on the allow-list."),
  other_network_count: range("Networks held (at least $1) that are not on the allow-list."),
  dust_network_count: range("Networks where owned accounts hold more than $0 and less than $1."),
  custom_network_count: range("Networks the user added."),
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
    "Days since install, as a range. For installs older than this analytics, since the oldest account or recovery phrase. unknown: no date recorded."
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
  count: p.count(
    "Account imports: how many accounts the import added. networks_deactivated: how many networks were turned off. networks_reset, tokens_reset: how many networks or tokens went back to Talisman's default."
  ),
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
    "How the user picked the recipient. signet_vault: a Signet multisig vault the wallet holds. typed: an address entered in the search field, typed or pasted. prefilled: the send opened with a recipient. unknown: none of these was seen."
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
  from_token_id: p.tokenId(
    "Chaindata token id of the token swapped from. custom: a token outside the chaindata catalogue, such as one the user added."
  ),
  to_token_id: p.tokenId(
    "Chaindata token id of the token swapped to. custom: a token outside the chaindata catalogue, such as one the user added."
  ),
  cross_chain: p.bool("The swap moves value from one network to another."),
  slippage_percent: p.nullable(
    p.number(
      "The slippage tolerance in percent, rounded to one decimal. Null when the provider takes no slippage setting.",
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
  direction: p.enum(
    [...RAMP_DIRECTIONS, ...STAKING_ACTIONS],
    "What the transaction does with the user's value. buy_provider_launched: whether the user went on to buy or to sell crypto. tao_trade events: whether the user buys or sells subnet alpha. Staking events: the staking action, as mobile."
  ),
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
    ["add", "edit", ...STAKING_ACTIONS],
    "What the user set out to do, as mobile names it. custom_network_saved: whether the user added or edited the network. staking_started: the staking action the modal opened for."
  ),
  testnet: p.bool("The network is a testnet."),
  enabled: p.bool(
    "Network and token events: the network or token is now turned on. staking_mev_shield_toggled: MEV Shield is now on. bittensor_settings_submitted: the account now accepts conviction-locked transfers."
  ),
  default_enabled: p.bool("The network or token is on by default, when the user has not set it."),
  has_coingecko_id: p.bool("The token has a CoinGecko id, so the wallet can price it."),

  staking_type: p.enum(
    STAKING_TYPES,
    "The staking system: Bittensor stake, a nomination pool, or SEEK staking on Ethereum."
  ),
  netuid: p.count("The Bittensor subnet, by its number. 0 is root."),
  is_root: p.bool("The Bittensor subnet is root, netuid 0."),
  symbol: p.symbol(
    "Symbol of the token whose amount the user entered: staked, unstaked, claimed or traded. token_details_opened: the token whose page opened. unknown: a symbol the catalogue cannot hold."
  ),
  mev_shield: p.bool(
    "The transaction went through Bittensor's MEV Shield, encrypted until it is included in a block."
  ),
  is_default: p.bool(
    "The value is the wallet's default. staking_validator_selected: the validator the remote config recommends for the subnet. staking_slippage_changed: the default slippage tolerance."
  ),
  is_featured: p.bool("The validator is featured in the validator list."),
  sort: p.enum(VALIDATOR_SORTS, "The order the validator list was sorted in."),
  searched: p.bool("The user had typed a search in the list when they picked."),
  position: p.count("1-based position of the pick in the list, as sorted and searched."),
  preset: p.bool("The user picked a preset value: the Reset button, not a typed value."),
  system: p.enum(
    EARN_SYSTEMS,
    "The Earn system behind the position: yield.xyz, SEEK staking, Bittensor staking, or a read-only DeFi position."
  ),
  yield_id: p.nullable(
    p.slug(
      "The yield.xyz product id, such as ethereum-eth-lido-staking. Null for another system, or an id that embeds an address."
    )
  ),
  earn_action: p.slug(
    "The yield.xyz pending action the user ran on a position, lowercased: claim_rewards, withdraw, restake_rewards and the like."
  ),

  key: p.enum(
    SETTING_KEYS,
    "The setting that changed, by mobile's name where mobile has the same setting: blurBalances is Hide balances, hideSmallBalance is Hide dust, currency is the fiat currency shown. The hide keys that are not mobile's are the extension's Don't show again choices."
  ),
  value: settingValue,
  language_code: p.slug("The language the user picked, such as en or zh-CN."),
  timeout_ms: p.durationMs(
    "Inactivity before the wallet locks itself, in milliseconds. 0: the timer is off."
  ),
  selection: p.enum(
    ACCOUNT_SELECTIONS,
    "What the user picked in the account list: one account, a folder, or All Accounts."
  ),
  accounts_total: range("Accounts in the wallet, contacts excluded, when the user switched."),
  result_count: p.count("How many results the search showed when the user stopped typing."),
  query_length: p.count("How many characters the search held, spaces at either end excluded."),
  hidden: p.bool("The NFT collection is now hidden from the portfolio."),
  favourite: p.bool("The NFT is now a favourite."),
  network_changed: p.bool("The edit changed the network the contact is limited to."),
  unused_only: p.bool(
    "The user deactivated only the networks where no account holds a balance, not all of them."
  ),
  site_count: p.count("Connected sites the action applied to."),
  session_only: p.bool(
    "The reminder is hidden until the browser restarts, not for three days: the user closed it while unbacked accounts hold funds."
  ),
} as const
