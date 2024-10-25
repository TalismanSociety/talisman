import { Metadata, TypeRegistry } from "@polkadot/types"

/**
 *
 * Detect Balances::transfer -> Balances::transfer_allow_death migration
 * https://github.com/paritytech/substrate/pull/12951
 *
 * `transfer_allow_death` is the preferred method,
 * so if something goes wrong during detection, we should assume the chain has migrated
 * @param metadataRpc string containing the hashed RPC metadata for the chain
 * @returns
 */
export const detectTransferMethod = (metadataRpc: `0x${string}`) => {
  const pjsMetadata = new Metadata(new TypeRegistry(), metadataRpc)
  pjsMetadata.registry.setMetadata(pjsMetadata)
  const balancesPallet = pjsMetadata.asLatest.pallets.find((pallet) => pallet.name.eq("Balances"))

  const balancesCallsTypeIndex = balancesPallet?.calls.value.type.toNumber()
  const balancesCallsType =
    balancesCallsTypeIndex !== undefined
      ? pjsMetadata.asLatest.lookup.types[balancesCallsTypeIndex]
      : undefined
  const hasDeprecatedTransferCall =
    balancesCallsType?.type.def.asVariant?.variants.find((variant) =>
      variant.name.eq("transfer"),
    ) !== undefined

  return hasDeprecatedTransferCall ? "transfer" : "transfer_allow_death"
}
