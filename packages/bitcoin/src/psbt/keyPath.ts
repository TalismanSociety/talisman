import { bip32Path } from "@scure/btc-signer"

import type { BitcoinKeyPath, BitcoinTree } from "../types"

/**
 * Maps an absolute BIP32 derivation (as found in PSBT bip32Derivation fields) back to
 * a tree-relative key path, by matching the account-level base path of each tree.
 * Returns null if the derivation belongs to none of the account's trees.
 */
export const keyPathFromDerivation = (
  derivation: number[],
  trees: Array<{ tree: BitcoinTree; derivationPath: string }>
): BitcoinKeyPath | null => {
  // expect base path (3 hardened segments) + change + index
  if (derivation.length !== 5) return null

  const change = derivation[3]
  const index = derivation[4]
  if ((change !== 0 && change !== 1) || index < 0 || index >= 0x80000000) return null

  for (const { tree, derivationPath } of trees) {
    const base = bip32Path(derivationPath)
    if (base.length === 3 && base.every((segment, i) => segment === derivation[i]))
      return { tree, change, index }
  }

  return null
}
