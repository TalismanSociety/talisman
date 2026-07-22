import { HDKey } from "@scure/bip32"
import type {
  BitcoinAccountScan,
  BitcoinKeyPath,
  BitcoinNetworkName,
  PsbtAccountMeta,
  ReplaceAddressInfo,
} from "@talismn/bitcoin"
import {
  BITCOIN_GAP_LIMIT,
  buildReplacementPsbt,
  finalizeAndExtract,
  getSpendableUtxos,
  inspectPsbt,
  isPsbtFullySigned,
  keyPathFromDerivation,
  reconstructReplaceContext,
  scanBitcoinAccount,
  signPsbtWithKeys,
} from "@talismn/bitcoin"
import { base64, deriveBitcoinAddressFromXpub, normalizeXpub } from "@talismn/crypto"
import { type Account, isAccountPlatformBitcoin } from "@talismn/keyring"

import { db } from "../../db"
import { ExtensionHandler } from "../../libs/Handler"
import { chainConnectorBtc } from "../../rpcs/chain-connector-btc"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { keyringStore } from "../keyring/store"
import { withBitcoinSigningKeys } from "../keyring/withBitcoinSigningKeys"
import { withSecretKey } from "../keyring/withSecretKey"
import { updateTransactionStatus } from "../transactions/helpers"
import { watchBitcoinTransaction } from "../transactions/watchBitcoinTransaction"
import { getBitcoinAccountTrees, getBtcNetworkHrp, serializeBitcoinUtxo } from "./helpers"
import { bitcoinAddressIndexStore } from "./store.addressIndex"
import type { RequestBitcoinReplacePreview, RequestBitcoinSubmit } from "./types"

const getPsbtAccountMeta = (account: Account): PsbtAccountMeta | undefined =>
  account.type === "hd-bitcoin" || account.type === "ledger-bitcoin"
    ? {
        masterFingerprint: account.masterFingerprint,
        trees: [
          { tree: "payments", derivationPath: account.keys.payments.derivationPath },
          { tree: "ordinals", derivationPath: account.keys.ordinals.derivationPath },
        ],
      }
    : undefined

/** all known (used) addresses of a scanned account, keyed by on-chain address */
const getScanAddressBook = (scan: BitcoinAccountScan): Map<string, ReplaceAddressInfo> => {
  const book = new Map<string, ReplaceAddressInfo>()
  for (const tree of scan.trees) {
    const accountKey = HDKey.fromExtendedKey(normalizeXpub(tree.spec.xpub))
    for (const change of [0, 1] as const) {
      for (const active of tree.chains[change].activeAddresses) {
        const publicKey = accountKey.deriveChild(change).deriveChild(active.index).publicKey
        if (!publicKey) continue
        book.set(active.address, {
          addressType: tree.spec.addressType,
          tree: tree.spec.tree,
          change,
          index: active.index,
          publicKey,
        })
      }
    }
  }
  return book
}

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
          // send only spends the payments tree — scanning ordinals here doubles the
          // (rate-limited) esplora request count for no benefit
          const spendTrees = trees.filter((t) => t.tree === "payments")
          const scan = await scanBitcoinAccount(api, {
            trees: spendTrees.length ? spendTrees : trees,
            hrp,
          })
          const utxos = await getSpendableUtxos(api, scan)
          return { utxos: utxos.map(serializeBitcoinUtxo), tipHeight: scan.tipHeight }
        }

        // WIF (single static P2WPKH address) account: query the address directly.
        // publicKeyHex stays empty — the PSBT builder derives the script from the address.
        const tip = await api.getTipHeight()
        const addressUtxos = await api.getAddressUtxos(account.address)
        return {
          tipHeight: tip,
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

      case "pri(bitcoin.account.preview)": {
        const { networkId, paymentsXpub } = request as RequestTypes["pri(bitcoin.account.preview)"]
        const api = await chainConnectorBtc.getApi(networkId)
        const hrp = getBtcNetworkHrp(networkId)

        const scan = await scanBitcoinAccount(api, {
          trees: [{ tree: "payments", xpub: normalizeXpub(paymentsXpub), addressType: "p2wpkh" }],
          hrp,
        })
        const tree = scan.trees[0]
        const txCount = tree.chains.reduce(
          (acc, chain) => acc + chain.activeAddresses.reduce((n, a) => n + a.txCount, 0),
          0
        )

        return {
          firstAddress: deriveBitcoinAddressFromXpub(paymentsXpub, "p2wpkh", 0, 0, hrp),
          totalSats: (tree.confirmedSats + tree.mempoolDeltaSats).toString(),
          txCount,
        }
      }

      case "pri(bitcoin.tx.submit)": {
        return await this.submit(request as RequestBitcoinSubmit)
      }

      case "pri(bitcoin.tx.replace.preview)": {
        return await this.replacePreview(request as RequestBitcoinReplacePreview)
      }
    }

    throw new Error(`Unable to handle message of type ${type}`)
  }

  /** builds an unsigned BIP125 replacement (speed-up or cancel) for a pending transaction */
  private async replacePreview({
    networkId,
    txid,
    type,
    feeRateSatVb,
  }: RequestBitcoinReplacePreview) {
    const row = await db.transactionsV2.get(txid)
    if (row?.platform !== "bitcoin") throw new Error("Transaction not found")
    if (row.status !== "pending") throw new Error("Transaction is no longer pending")

    const account = await keyringStore.getAccount(row.account)
    if (!account || !isAccountPlatformBitcoin(account)) throw new Error("Account not found")
    if (account.type === "watch-only-bitcoin")
      throw new Error("Cannot replace from a watched account")

    const api = await chainConnectorBtc.getApi(networkId)
    const hrp = getBtcNetworkHrp(networkId)
    const trees = getBitcoinAccountTrees(account)

    let ourAddresses: Map<string, ReplaceAddressInfo>
    let selfAddress: string
    if (trees) {
      const scan = await scanBitcoinAccount(api, { trees, hrp })
      ourAddresses = getScanAddressBook(scan)

      // fresh internal-chain address: cancel target, or change target when needed
      const payments = scan.trees.find((t) => t.spec.tree === "payments") ?? scan.trees[0]
      const firstUnused = payments.chains[1].firstUnusedIndex
      const lastIssued = await bitcoinAddressIndexStore.getLastIssued(
        payments.spec.xpub,
        payments.spec.tree,
        1
      )
      const index = Math.min(
        Math.max(firstUnused, (lastIssued ?? -1) + 1),
        firstUnused + BITCOIN_GAP_LIMIT - 1
      )
      await bitcoinAddressIndexStore.setLastIssued(payments.spec.xpub, payments.spec.tree, 1, index)
      selfAddress = deriveBitcoinAddressFromXpub(
        payments.spec.xpub,
        payments.spec.addressType,
        1,
        index,
        hrp
      )
    } else {
      // WIF: one static address serves as receive and change — flag it as change so the
      // original's self-output is recognized as such; the public key comes from the witness
      ourAddresses = new Map([
        [
          account.address,
          {
            addressType: "p2wpkh" as const,
            tree: "payments" as const,
            change: 1 as const,
            index: 0,
            publicKey: new Uint8Array(0),
          },
        ],
      ])
      selfAddress = account.address
    }

    const [context, tipHeight] = await Promise.all([
      reconstructReplaceContext(
        (id) => api.getTxHex(id),
        row.payload,
        ourAddresses,
        networkId as BitcoinNetworkName
      ),
      api.getTipHeight(),
    ])

    const result = buildReplacementPsbt({
      context,
      type,
      feeRateSatVb,
      network: networkId as BitcoinNetworkName,
      selfAddress,
      account: getPsbtAccountMeta(account),
      lockTimeHeight: tipHeight,
    })

    return {
      psbtBase64: result.psbtBase64,
      feeSats: String(result.feeSats),
      sentSats: String(result.sentSats),
      tree: result.usesOrdinalsUtxos ? ("ordinals" as const) : ("payments" as const),
    }
  }

  private async submit({
    networkId,
    address,
    psbtBase64,
    maxFeeSats,
    replacesTxid,
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

    // the replacement is in the mempool: the conflicting original can no longer confirm
    if (replacesTxid) await updateTransactionStatus(replacesTxid, "replaced")

    watchBitcoinTransaction(networkId, txid, final.txHex, account.address, {
      txInfo,
      notifications: false,
    })

    return { txid }
  }
}
