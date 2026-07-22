import { base64, hex } from "@scure/base"
import { Address, Transaction } from "@scure/btc-signer"

import { DUST_LIMIT_SATS, RBF_SEQUENCE } from "../constants"
import { getBtcSignerNetwork } from "../networks"
import type { BitcoinNetworkName, BitcoinTree, BitcoinUtxo } from "../types"
import { buildPsbtInput, type PsbtAccountMeta, scriptToAddress } from "./buildTransferPsbt"

/** identity of one of our addresses, used to reclaim the original transaction's inputs */
export type ReplaceAddressInfo = {
  addressType: "p2wpkh" | "p2tr"
  tree: BitcoinTree
  change: 0 | 1
  index: number
  publicKey: Uint8Array
}

export type ReplaceContext = {
  /** original inputs, reconstructed as spendable utxos (all must be ours) */
  inputs: BitcoinUtxo[]
  /** outputs that are not our change — preserved verbatim on speed-up */
  externalOutputs: Array<{ address: string; amountSats: bigint }>
  /** our internal-chain output of the original transaction, if any */
  changeOutput: { address: string; amountSats: bigint } | null
  oldFeeSats: bigint
  /** virtual size of the original transaction */
  vsize: number
}

const TX_PARSE_OPTS = {
  allowUnknownOutputs: true,
  allowUnknownInputs: true,
  disableScriptCheck: true,
} as const

/**
 * Rebuilds the spending context of a broadcast transaction so it can be replaced
 * (BIP125). Every input must be recognized as ours via `ourAddresses`; p2wpkh input
 * public keys are recovered from the original witness when the address book entry
 * has none (single-key WIF accounts).
 */
export const reconstructReplaceContext = async (
  getTxHex: (txid: string) => Promise<string>,
  txHex: string,
  ourAddresses: Map<string, ReplaceAddressInfo>,
  network: BitcoinNetworkName
): Promise<ReplaceContext> => {
  const btcNetwork = getBtcSignerNetwork(network)
  const addressCoder = Address(btcNetwork)
  const tx = Transaction.fromRaw(hex.decode(txHex), TX_PARSE_OPTS)

  const inputs: BitcoinUtxo[] = []
  let totalInSats = 0n
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i)
    if (!input.txid || input.index === undefined)
      throw new Error(`Original transaction input ${i} is malformed`)

    const prevTxid = hex.encode(input.txid)
    const prevTx = Transaction.fromRaw(hex.decode(await getTxHex(prevTxid)), TX_PARSE_OPTS)
    const prevOut = prevTx.getOutput(input.index)
    if (prevOut.script === undefined || prevOut.amount === undefined)
      throw new Error(`Missing previous output for input ${i}`)

    const address = scriptToAddress(prevOut.script, addressCoder)
    const info = ourAddresses.get(address)
    if (!info) throw new Error(`Input ${i} (${address}) does not belong to this account`)

    // p2wpkh witness stack is [signature, publicKey] — recover the key when unknown
    let publicKey = info.publicKey
    if (!publicKey.length && info.addressType === "p2wpkh") {
      const witness = input.finalScriptWitness
      if (witness?.length === 2 && witness[1].length === 33) publicKey = witness[1]
    }
    if (!publicKey.length) throw new Error(`Cannot determine public key for input ${i}`)

    totalInSats += prevOut.amount
    inputs.push({
      txid: prevTxid,
      vout: input.index,
      valueSats: prevOut.amount,
      confirmations: 0,
      address,
      addressType: info.addressType,
      tree: info.tree,
      change: info.change,
      index: info.index,
      publicKey,
    })
  }

  const externalOutputs: ReplaceContext["externalOutputs"] = []
  let changeOutput: ReplaceContext["changeOutput"] = null
  let totalOutSats = 0n
  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i)
    if (output.script === undefined || output.amount === undefined)
      throw new Error(`Original transaction output ${i} is malformed`)
    const address = scriptToAddress(output.script, addressCoder)
    totalOutSats += output.amount

    const info = ourAddresses.get(address)
    // only the first internal-chain output counts as change; anything else
    // (including self-sends to a receive address) is preserved verbatim
    if (info?.change === 1 && !changeOutput) changeOutput = { address, amountSats: output.amount }
    else externalOutputs.push({ address, amountSats: output.amount })
  }

  return {
    inputs,
    externalOutputs,
    changeOutput,
    oldFeeSats: totalInSats - totalOutSats,
    vsize: tx.vsize,
  }
}

// conservative per-element virtual sizes (vB)
const INPUT_VSIZE = { p2wpkh: 68, p2tr: 58 } as const
const OUTPUT_VSIZE = { p2wpkh: 31, p2tr: 43 } as const
const OUTPUT_VSIZE_OTHER = 34
const TX_OVERHEAD_VSIZE = 11

const estimateVsize = (inputs: BitcoinUtxo[], outputAddresses: string[]): number => {
  const inputVb = inputs.reduce((acc, u) => acc + INPUT_VSIZE[u.addressType], 0)
  const outputVb = outputAddresses.reduce((acc, address) => {
    if (address.startsWith("bc1p") || address.startsWith("tb1p")) return acc + OUTPUT_VSIZE.p2tr
    if (address.startsWith("bc1q") || address.startsWith("tb1q")) return acc + OUTPUT_VSIZE.p2wpkh
    return acc + OUTPUT_VSIZE_OTHER
  }, 0)
  return TX_OVERHEAD_VSIZE + inputVb + outputVb
}

const bigMax = (a: bigint, b: bigint) => (a > b ? a : b)

export type BuildReplacementResult = {
  psbt: Uint8Array
  psbtBase64: string
  feeSats: bigint
  /** total sats reaching non-change outputs (cancel: the swept amount) */
  sentSats: bigint
  changeSats: bigint | null
  selectedUtxos: BitcoinUtxo[]
  usesOrdinalsUtxos: boolean
}

/**
 * Builds a BIP125 replacement for a pending transaction.
 * - `speed-up` re-sends the same outputs with a higher fee, paid out of change
 * - `cancel` redirects everything to `selfAddress` minus the new fee
 * The fee respects both the requested rate and the BIP125 minimum
 * (old fee + 1 sat/vB of the replacement's size).
 */
export const buildReplacementPsbt = (params: {
  context: ReplaceContext
  type: "speed-up" | "cancel"
  feeRateSatVb: number
  network: BitcoinNetworkName
  /** fresh internal-chain address: cancel target, or change target if the original had no change */
  selfAddress: string
  account?: PsbtAccountMeta
  lockTimeHeight?: number
}): BuildReplacementResult => {
  const { context, type, selfAddress } = params
  const network = getBtcSignerNetwork(params.network)
  const feeRate = BigInt(Math.max(1, Math.ceil(params.feeRateSatVb)))

  const totalInSats = context.inputs.reduce((acc, u) => acc + u.valueSats, 0n)

  const buildTx = (outputs: Array<{ address: string; amountSats: bigint }>) => {
    const tx = new Transaction(
      params.lockTimeHeight ? { lockTime: params.lockTimeHeight } : undefined
    )
    for (const utxo of context.inputs) {
      tx.addInput({ ...buildPsbtInput(utxo, params.account, network), sequence: RBF_SEQUENCE })
    }
    for (const output of outputs) tx.addOutputAddress(output.address, output.amountSats, network)
    return tx
  }

  const finish = (
    outputs: Array<{ address: string; amountSats: bigint }>,
    feeSats: bigint,
    sentSats: bigint,
    changeSats: bigint | null
  ): BuildReplacementResult => {
    const tx = buildTx(outputs)
    const psbt = tx.toPSBT()
    return {
      psbt,
      psbtBase64: base64.encode(psbt),
      feeSats,
      sentSats,
      changeSats,
      selectedUtxos: context.inputs,
      usesOrdinalsUtxos: context.inputs.some((u) => u.tree === "ordinals"),
    }
  }

  if (type === "cancel") {
    const estVsize = estimateVsize(context.inputs, [selfAddress])
    const minFee = context.oldFeeSats + BigInt(estVsize)
    const feeSats = bigMax(feeRate * BigInt(estVsize), minFee)
    const amount = totalInSats - feeSats
    const dustLimit = selfAddress.startsWith("bc1p") || selfAddress.startsWith("tb1p") ? 330n : 294n
    if (amount < dustLimit)
      throw new Error("Transaction is too small to cancel: the fee would consume it entirely")
    return finish([{ address: selfAddress, amountSats: amount }], feeSats, amount, null)
  }

  // speed-up
  const externalSum = context.externalOutputs.reduce((acc, o) => acc + o.amountSats, 0n)
  const changeAddress = context.changeOutput?.address ?? selfAddress
  const outputAddresses = [...context.externalOutputs.map((o) => o.address), changeAddress]
  const estVsize = estimateVsize(context.inputs, outputAddresses)
  const minFee = context.oldFeeSats + BigInt(estVsize)
  let feeSats = bigMax(feeRate * BigInt(estVsize), minFee)

  let changeSats: bigint | null = totalInSats - externalSum - feeSats
  const changeDust =
    DUST_LIMIT_SATS[
      changeAddress.startsWith("bc1p") || changeAddress.startsWith("tb1p") ? "p2tr" : "p2wpkh"
    ]
  if (changeSats < 0n)
    throw new Error("Insufficient change to cover the higher fee — cannot speed up")
  if (changeSats < changeDust) {
    // change would be dust: give it to the fee instead
    feeSats += changeSats
    changeSats = null
  }

  const outputs = [...context.externalOutputs]
  if (changeSats !== null) outputs.push({ address: changeAddress, amountSats: changeSats })

  return finish(outputs, feeSats, externalSum, changeSats)
}
