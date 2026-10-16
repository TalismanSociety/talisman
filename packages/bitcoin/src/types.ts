export type BitcoinNetworkName = "bitcoin" | "bitcoin-signet"

export type BitcoinHrp = "bc" | "tb"

export type BitcoinAddressType = "p2wpkh" | "p2tr"

export type BitcoinTree = "payments" | "ordinals"

export type BitcoinKeyPath = {
  tree: BitcoinTree
  change: 0 | 1
  index: number
}

export type BitcoinTreeSpec = {
  tree: BitcoinTree
  xpub: string
  addressType: BitcoinAddressType
}

export type BitcoinUtxo = {
  txid: string
  vout: number
  valueSats: bigint
  confirmations: number
  address: string
  addressType: BitcoinAddressType
  tree: BitcoinTree
  change: 0 | 1
  index: number
  /** compressed child public key for this utxo's address */
  publicKey: Uint8Array
}

export type TreeChainScan = {
  usedCount: number
  /** lastUsedIndex + 1 — the address shown by the static receive UX */
  firstUnusedIndex: number
  activeAddresses: Array<{
    index: number
    address: string
    confirmedSats: bigint
    mempoolDeltaSats: bigint
    txCount: number
  }>
}

export type BitcoinTreeScan = {
  spec: BitcoinTreeSpec
  /** [external (receive), internal (change)] */
  chains: [TreeChainScan, TreeChainScan]
  confirmedSats: bigint
  mempoolDeltaSats: bigint
}

export type BitcoinAccountScan = {
  trees: BitcoinTreeScan[]
  tipHeight: number
}

/** warm-start hints from a previous scan: used-address count per tree/chain */
export type ScanCursor = Record<string, [external: number, internal: number]>
