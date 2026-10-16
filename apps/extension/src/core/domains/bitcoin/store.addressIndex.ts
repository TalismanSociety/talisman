import { StorageProvider } from "../../libs/Store"

/**
 * Tracks the last receive-address index handed out per (account xpub, tree, chain), so
 * "fresh address" mode can rotate without re-issuing addresses shown before.
 * Keys: `${xpub}:${tree}:${chain}`
 */
export type BitcoinAddressIndexData = Record<string, number>

class BitcoinAddressIndexStore extends StorageProvider<BitcoinAddressIndexData> {
  async getLastIssued(xpub: string, tree: string, chain: 0 | 1): Promise<number | undefined> {
    return await this.get(`${xpub}:${tree}:${chain}`)
  }

  async setLastIssued(xpub: string, tree: string, chain: 0 | 1, index: number): Promise<void> {
    await this.set({ [`${xpub}:${tree}:${chain}`]: index })
  }
}

export const bitcoinAddressIndexStore = new BitcoinAddressIndexStore("bitcoinAddressIndex")
