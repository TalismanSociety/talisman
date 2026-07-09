import type { BitcoinHrp, BitcoinTreeSpec, BitcoinUtxo } from "@talismn/bitcoin"
import type { BtcNetworkId } from "@talismn/chaindata-provider"
import { hex } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"

import type { SerializedBitcoinUtxo } from "./types"

export const getBtcNetworkHrp = (networkId: BtcNetworkId): BitcoinHrp =>
  networkId === "bitcoin" ? "bc" : "tb"

/** derivation trees of a bitcoin account, or null if the account is not tree-based (WIF) */
export const getBitcoinAccountTrees = (account: Account): BitcoinTreeSpec[] | null => {
  switch (account.type) {
    case "hd-bitcoin":
    case "ledger-bitcoin":
      return [
        { tree: "payments", xpub: account.keys.payments.xpub, addressType: "p2wpkh" },
        { tree: "ordinals", xpub: account.keys.ordinals.xpub, addressType: "p2tr" },
      ]
    case "watch-only-bitcoin":
      return [{ tree: "payments", xpub: account.address, addressType: account.addressType }]
    default:
      return null
  }
}

export const serializeBitcoinUtxo = (utxo: BitcoinUtxo): SerializedBitcoinUtxo => ({
  txid: utxo.txid,
  vout: utxo.vout,
  valueSats: utxo.valueSats.toString(),
  confirmations: utxo.confirmations,
  address: utxo.address,
  addressType: utxo.addressType,
  tree: utxo.tree,
  change: utxo.change,
  index: utxo.index,
  publicKeyHex: hex.encode(utxo.publicKey),
})

export const deserializeBitcoinUtxo = (utxo: SerializedBitcoinUtxo): BitcoinUtxo => ({
  txid: utxo.txid,
  vout: utxo.vout,
  valueSats: BigInt(utxo.valueSats),
  confirmations: utxo.confirmations,
  address: utxo.address,
  addressType: utxo.addressType,
  tree: utxo.tree,
  change: utxo.change,
  index: utxo.index,
  publicKey: utxo.publicKeyHex ? hex.decode(utxo.publicKeyHex) : new Uint8Array(0),
})
