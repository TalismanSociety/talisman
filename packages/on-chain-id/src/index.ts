import { lookupAddresses, lookupAznsAddresses, lookupEnsAddresses } from "./util/addressesToNames"
import { resolveAznsNames, resolveEnsNames, resolveNames } from "./util/namesToAddresses"
import { Config, DropFirst, OptionalConfig } from "./util/types"

export type {
  Config as OnChainIdConfig,
  NsLookupType,
  OnChainIds,
  ResolvedNames,
} from "./util/types"
export * from "./util/isPotentialAzns"
export * from "./util/isPotentialEns"

export class OnChainId {
  #config: Config

  constructor(config: OptionalConfig) {
    this.#config = {
      ...config,
      networkIdEthereum: config.networkIdEthereum ?? "1",
    }
  }

  resolveNames = (...args: DropFirst<Parameters<typeof resolveNames>>) =>
    resolveNames(this.#config, ...args)
  resolveEnsNames = (...args: DropFirst<Parameters<typeof resolveEnsNames>>) =>
    resolveEnsNames(this.#config, ...args)
  /** @deprecated */
  resolveAznsNames = (...args: DropFirst<Parameters<typeof resolveAznsNames>>) =>
    resolveAznsNames(this.#config, ...args)

  lookupAddresses = (...args: DropFirst<Parameters<typeof lookupAddresses>>) =>
    lookupAddresses(this.#config, ...args)
  /** @deprecated */
  lookupEnsAddresses = (...args: DropFirst<Parameters<typeof lookupEnsAddresses>>) =>
    lookupEnsAddresses(this.#config, ...args)
  lookupAznsAddresses = (...args: DropFirst<Parameters<typeof lookupAznsAddresses>>) =>
    lookupAznsAddresses(this.#config, ...args)
}
