import { Metadata, TypeRegistry } from "@polkadot/types"
import type { RegistryTypes, SignerPayloadJSON } from "@polkadot/types/types"

import log from "../log"
import type { Chain } from "./types"

export const getTypeRegistry = (chain: Chain, payload: SignerPayloadJSON) => {
  log.debug(`[sapi] getTypeRegistry for payload (${chain.token.symbol})`)
  const registry = new TypeRegistry()

  if (chain.registryTypes) registry.register(chain.registryTypes as RegistryTypes)

  const meta = new Metadata(registry, chain.hexMetadata)
  registry.setMetadata(meta, payload.signedExtensions, chain.signedExtensions) // ~30ms

  return registry
}
