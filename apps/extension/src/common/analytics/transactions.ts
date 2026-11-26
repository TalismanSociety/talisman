import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { AccountType } from "@talismn/keyring"

import { toDappDomain } from "./dapp"

export const CHAIN_PLATFORMS = ["ethereum", "polkadot", "solana"] as const
export type ChainPlatform = (typeof CHAIN_PLATFORMS)[number]

export const SIGNERS = ["local", "ledger", "vault", "signet", "watched"] as const
export type Signer = (typeof SIGNERS)[number]

const SIGNER_OF_ACCOUNT_TYPE: Record<AccountType, Signer | null> = {
  "keypair": "local",
  "ledger-polkadot": "ledger",
  "ledger-ethereum": "ledger",
  "ledger-solana": "ledger",
  "polkadot-vault": "vault",
  "signet": "signet",
  "watch-only": "watched",
  "contact": null,
}

export const signerOf = (type: AccountType): Signer | null => SIGNER_OF_ACCOUNT_TYPE[type]

export const CUSTOM_NETWORK_ID = "custom"

export const TX_TYPES = [
  "transfer",
  "approve-erc20",
  "swap-simpleswap",
  "swap-stealthex",
  "swap-lifi",
  "swap-chainflip",
  "swap-bittensor-evm",
  "swap-forevermoney",
  "swap-bittensor-dtao",
  "bittensor-staking",
  "other",
] as const satisfies readonly (WalletTransactionInfo["type"] | "other")[]
export type TxType = (typeof TX_TYPES)[number]

type MissingTxTypes = Exclude<WalletTransactionInfo["type"], TxType>
/** @knipignore compile-time check: fails when WalletTransactionInfo gains a type TX_TYPES lacks */
export const txTypesAreExhaustive: [MissingTxTypes] extends [never] ? true : MissingTxTypes = true

export const txTypeOf = (txInfo: Pick<WalletTransactionInfo, "type"> | undefined): TxType =>
  txInfo?.type ?? "other"

export const SUBMITTERS = ["wallet", "dapp"] as const
export type SubmittedBy = (typeof SUBMITTERS)[number]

export type Submitter =
  | { submitted_by: "wallet" }
  | { submitted_by: "dapp"; dapp_domain: string | null }

export const WALLET_SUBMITTER: Submitter = { submitted_by: "wallet" }

export const dappSubmitter = (url: string | undefined): Submitter => ({
  submitted_by: "dapp",
  dapp_domain: toDappDomain(url),
})

export const submitterOfStoredTransaction = (siteUrl: string | undefined): Submitter =>
  siteUrl ? dappSubmitter(siteUrl) : WALLET_SUBMITTER

export const SETTLED_STATUSES = ["success", "error", "replaced", "dropped"] as const
export type SettledStatus = (typeof SETTLED_STATUSES)[number]
