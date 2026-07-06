/**
 * Minimal structural types matching the polkadot-js keystore JSON formats, so we can
 * import/export pjs-compatible files without depending on `@polkadot/keyring` or
 * `@polkadot/ui-keyring` at runtime.
 */

/** Same shape as `KeyringPair$Json` from `@polkadot/keyring/types` */
export type PjsKeyringPairJson = {
  address: string
  encoded: string
  encoding: { content: string | string[]; type: string | string[]; version: string }
  meta: Record<string, unknown>
}

/** Same shape as `KeyringPairs$Json` from `@polkadot/ui-keyring/types` (batch export format) */
export type PjsKeyringPairsJson = {
  encoded: string
  encoding: { content: string | string[]; type: string | string[]; version: string }
  accounts: { address: string; meta: Record<string, unknown> }[]
}
