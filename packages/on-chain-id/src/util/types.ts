import { SupportedChainId } from "@azns/resolver-core"
import { TypeRegistry } from "@polkadot/types"
import { ChainConnectors } from "@talismn/balances"

/** A map of addresses to their on-chain ids. */
export type OnChainIds = Map<string, string | null>

/** A map of lookup names to their resolved addresses. */
export type ResolvedNames = Map<string, [string, NsLookupType] | null>

/** These are the supported name lookup types. */
export type NsLookupType = "ens" | "azns"

/**
 * Used as the first parameter to all `namesToAddresses`/`addressesToNames` functions.
 */
export type Config = {
  // TODO: Create a package for `/apps/extension/src/core/util/getTypeRegistry.ts` which
  // can be used from outside of the wallet.
  registryPolkadot: TypeRegistry
  registryAlephZero: TypeRegistry
  chainConnectors: ChainConnectors

  /** Used for polkadot identity lookups */
  chainIdPolkadot: string
  /** Used for azns lookups */
  chainIdAlephZero: string
  /** Used for azns lookups */
  aznsSupportedChainIdAlephZero: `${SupportedChainId}`
  /** Used for ens lookups */
  networkIdEthereum: string
}

export type OptionalConfigParams =
  | "chainIdPolkadot"
  | "chainIdAlephZero"
  | "aznsSupportedChainIdAlephZero"
  | "networkIdEthereum"
export type OptionalConfig = Omit<Config, OptionalConfigParams> &
  Partial<Pick<Config, OptionalConfigParams>>

/**
 * Removes the first argument from a tuple type.
 *
 *     type AllParams = ["one", "two", "three"]
 *     type DropFirstParams = DropFirst<AllParams> // evaluates to ["two", "three"]
 */
export type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never
