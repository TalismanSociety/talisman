import type { BitcoinKeyPath, BitcoinNetworkName } from "@talismn/bitcoin"
import {
  BITCOIN_GAP_LIMIT,
  finalizeAndExtract,
  getSpendableUtxos,
  inspectPsbt,
  isPsbtFullySigned,
  keyPathFromDerivation,
  scanBitcoinAccount,
  signPsbtWithKeys,
} from "@talismn/bitcoin"
import { base64, deriveBitcoinAddressFromXpub } from "@talismn/crypto"
import { isAccountPlatformBitcoin } from "@talismn/keyring"

import { ExtensionHandler } from "../../libs/Handler"
import { chainConnectorBtc } from "../../rpcs/chain-connector-btc"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { keyringStore } from "../keyring/store"
import { withBitcoinSigningKeys } from "../keyring/withBitcoinSigningKeys"
import { withSecretKey } from "../keyring/withSecretKey"
import { watchBitcoinTransaction } from "../transactions/watchBitcoinTransaction"
import { getBitcoinAccountTrees, getBtcNetworkHrp, serializeBitcoinUtxo } from "./helpers"
import { bitcoinAddressIndexStore } from "./store.addressIndex"
import type { RequestBitcoinSubmit } from "./types"

export class BitcoinExtensionHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    _id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType]
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(bitcoin.address.getUnused)": {
        const { networkId, address, tree, chain, fresh } =
          request as RequestTypes["pri(bitcoin.address.getUnused)"]

        const account = await keyringStore.getAccount(address)
        if (!account) throw new Error("Account not found")
        const trees = getBitcoinAccountTrees(account)
        if (!trees) throw new Error("Not an HD bitcoin account")

        const treeSpec = trees.find((t) => t.tree === tree)
        if (!treeSpec) throw new Error(`Account has no ${tree} tree`)

        const api = await chainConnectorBtc.getApi(networkId)
        const hrp = getBtcNetworkHrp(networkId)

        const scan = await scanBitcoinAccount(api, { trees: [treeSpec], hrp })
        const firstUnused = scan.trees[0].chains[chain].firstUnusedIndex

        let index = firstUnused
        if (fresh) {
          const lastIssued = await bitcoinAddressIndexStore.getLastIssued(
            treeSpec.xpub,
            tree,
            chain
          )
          // rotate forward from what was already handed out, but never beyond the gap
          // limit — addresses past it would be missed by standard recovery scans
          index = Math.min(
            Math.max(firstUnused, (lastIssued ?? -1) + 1),
            firstUnused + BITCOIN_GAP_LIMIT - 1
          )
          await bitcoinAddressIndexStore.setLastIssued(treeSpec.xpub, tree, chain, index)
        }

        return {
          address: deriveBitcoinAddressFromXpub(
            treeSpec.xpub,
            treeSpec.addressType,
            chain,
            index,
            hrp
          ),
          index,
        }
      }

      case "pri(bitcoin.utxos.get)": {
        const { networkId, address } = request as RequestTypes["pri(bitcoin.utxos.get)"]

        const account = await keyringStore.getAccount(address)
        if (!account || !isAccountPlatformBitcoin(account)) throw new Error("Account not found")

        const api = await chainConnectorBtc.getApi(networkId)
        const hrp = getBtcNetworkHrp(networkId)
        const trees = getBitcoinAccountTrees(account)

        if (trees) {
          const scan = await scanBitcoinAccount(api, { trees, hrp })
          const utxos = await getSpendableUtxos(api, scan)
          return { utxos: utxos.map(serializeBitcoinUtxo) }
        }

        // WIF (single static P2WPKH address) account: query the address directly.
        // publicKeyHex stays empty — the PSBT builder derives the script from the address.
        const tip = await api.getTipHeight()
        const addressUtxos = await api.getAddressUtxos(account.address)
        return {
          utxos: addressUtxos.map((utxo) => ({
            txid: utxo.txid,
            vout: utxo.vout,
            valueSats: String(utxo.value),
            confirmations: utxo.status.block_height ? tip - utxo.status.block_height + 1 : 0,
            address: account.address,
            addressType: "p2wpkh" as const,
            tree: "payments" as const,
            change: 0 as const,
            index: 0,
            publicKeyHex: "",
          })),
        }
      }

      case "pri(bitcoin.feeEstimates.get)": {
        const { networkId } = request as RequestTypes["pri(bitcoin.feeEstimates.get)"]
        const api = await chainConnectorBtc.getApi(networkId)
        return await api.getFeeEstimates()
      }

      case "pri(bitcoin.tx.submit)": {
        return await this.submit(request as RequestBitcoinSubmit)
      }
    }

    throw new Error(`Unable to handle message of type ${type}`)
  }

  private async submit({
    networkId,
    address,
    psbtBase64,
    maxFeeSats,
    txInfo,
  }: RequestBitcoinSubmit) {
    const account = await keyringStore.getAccount(address)
    if (!account || !isAccountPlatformBitcoin(account)) throw new Error("Account not found")
    if (account.type === "watch-only-bitcoin") throw new Error("Cannot send from a watched account")

    const psbt = base64.decode(psbtBase64)
    const info = inspectPsbt(psbt, networkId as BitcoinNetworkName)

    // guard against fee computation bugs: the frontend states the fee it displayed
    if (info.feeSats > BigInt(maxFeeSats))
      throw new Error(`Transaction fee ${info.feeSats} exceeds maximum ${maxFeeSats}`)

    let signed = psbt
    if (!isPsbtFullySigned(psbt)) {
      if (account.type === "ledger-bitcoin")
        throw new Error("Transaction has not been signed by the hardware device")

      if (account.type === "hd-bitcoin") {
        const trees = [
          { tree: "payments" as const, derivationPath: account.keys.payments.derivationPath },
          { tree: "ordinals" as const, derivationPath: account.keys.ordinals.derivationPath },
        ]

        // every input must belong to this account
        const paths: BitcoinKeyPath[] = info.inputs.map((input, i) => {
          const derivation = input.derivations.find(
            (d) => d.fingerprint === account.masterFingerprint
          )
          const path = derivation && keyPathFromDerivation(derivation.path, trees)
          if (!path) throw new Error(`Input ${i} does not belong to this account`)
          return path
        })

        const result = await withBitcoinSigningKeys(account.address, paths, (keys) =>
          signPsbtWithKeys(
            psbt,
            keys.map((key, inputIndex) => ({ inputIndex, secretKey: key.secretKey }))
          )
        )
        signed = result.unwrap()
      } else {
        // WIF keypair account: one key signs every input
        const result = await withSecretKey(account.address, (secretKey) =>
          signPsbtWithKeys(
            psbt,
            info.inputs.map((_, inputIndex) => ({ inputIndex, secretKey }))
          )
        )
        signed = result.unwrap()
      }
    }

    const final = finalizeAndExtract(signed)
    const api = await chainConnectorBtc.getApi(networkId)
    const txid = await api.broadcastTx(final.txHex)

    watchBitcoinTransaction(networkId, txid, final.txHex, account.address, {
      txInfo,
      notifications: false,
    })

    return { txid }
  }
}
