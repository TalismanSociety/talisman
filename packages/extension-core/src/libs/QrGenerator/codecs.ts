import { Bytes, Struct, str, u16, u8 } from "scale-ts"

export const $networkSpecs = Struct({
  base58prefix: u16,
  color: str,
  decimals: u8,
  encryption: u8, // Ed25519=0, Sr25519=1, Ecdsa=2, ethereum=3
  genesis_hash: Bytes(32),
  logo: str,
  name: str,
  path_id: str,
  secondary_color: str,
  title: str,
  unit: str,
})

export const $addNetworkSpecsPayload = Struct({ specs: Bytes(undefined) })

export const $updateNetworkMetadataPayload = Struct({
  meta: Bytes(undefined),
  genesis_hash: Bytes(32),
})
