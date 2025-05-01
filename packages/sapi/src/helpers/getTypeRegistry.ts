import { Metadata, TypeRegistry } from "@polkadot/types"
import { RegistryTypes, SignerPayloadJSON } from "@polkadot/types/types"

import log from "../log"
import { Chain } from "./types"

export const getTypeRegistry = (chain: Chain, payload: SignerPayloadJSON) => {
  log.log(`[sapi] getTypeRegistry begin: ${Date.now()}`)
  const registry = new TypeRegistry()

  if (chain.registryTypes) registry.register(chain.registryTypes as RegistryTypes)

  const meta = new Metadata(registry, chain.hexMetadata)
  registry.setMetadata(meta, payload.signedExtensions, chain.signedExtensions) // ~30ms

  log.log(`[sapi] getTypeRegistry end: ${Date.now()}`)
  return registry
}
