import { Metadata, TypeRegistry } from "@polkadot/types"
import { RegistryTypes, SignerPayloadJSON } from "@polkadot/types/types"
import { log } from "extension-shared"

import { Chain } from "./types"

export const getTypeRegistry = (chain: Chain, payload: SignerPayloadJSON) => {
  const stop = log.timer("[sapi] getTypeRegistry")
  const registry = new TypeRegistry()

  if (chain.registryTypes) registry.register(chain.registryTypes as RegistryTypes)

  const meta = new Metadata(registry, chain.hexMetadata)
  registry.setMetadata(meta, payload.signedExtensions, chain.signedExtensions) // ~30ms

  stop()
  return registry
}
