import { log } from "@common/log"
import { passwordStore } from "@core/domains/app/store.password"
import { serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import { getNextNonce, releaseReservedNonce } from "@core/domains/ethereum/nonceManager"
import { withSecretKey } from "@core/domains/keyring/withSecretKey"
import { watchEthereumTransaction } from "@core/domains/transactions/watchEthereumTransaction"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { getErrorMessage } from "@talismn/util"
import { filter, firstValueFrom } from "rxjs"
import {
  bytesToHex,
  type Hex,
  keccak256,
  type TransactionRequest,
  type TransactionSerializableEIP1559,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"

import type { BuiltLeg } from "../types"
import { admitEvmLeg } from "./admit"
import { isAdmissible } from "./machine"
import { getPlan } from "./store"
import type { SwapPlanRef } from "./types"

export type SignOutcome =
  | { type: "sent"; hash: Hex }
  | { type: "locked" }
  | { type: "out-of-bounds"; violation: string }
  /** the leg stopped waiting for a transaction while this one was being built */
  | { type: "stale" }
  | { type: "failed"; error: unknown }

/** a node that already holds the bytes, or saw them land, is not an error */
const BROADCAST_NOISE = ["already known", "already imported", "nonce too low"]

const isBroadcastNoise = (err: unknown) => {
  const message = getErrorMessage(err).toLowerCase()
  return BROADCAST_NOISE.some((noise) => message.includes(noise))
}

const isUnlocked = async () =>
  (await firstValueFrom(passwordStore.isLoggedIn.pipe(filter((value) => value !== "UNKNOWN")))) ===
  "TRUE"

const toEip1559 = (
  request: TransactionRequest,
  chainId: number,
  nonce: number
): TransactionSerializableEIP1559 | null => {
  if (
    !request.to ||
    request.gas === undefined ||
    request.maxFeePerGas === undefined ||
    request.maxPriorityFeePerGas === undefined
  )
    return null
  return {
    type: "eip1559",
    chainId,
    nonce,
    to: request.to,
    data: request.data,
    value: request.value ?? 0n,
    gas: request.gas,
    maxFeePerGas: request.maxFeePerGas,
    maxPriorityFeePerGas: request.maxPriorityFeePerGas,
  }
}

const getDuePlan = async ({ id, leg }: SwapPlanRef) => {
  const plan = await getPlan(id)
  return plan && isAdmissible(plan, leg, Date.now()) ? plan : null
}

/**
 * Signs a built leg with the plan's pinned nonce, admits the bytes against the leg's bound, then
 * broadcasts them. From admission on, the plan holds the leg's nonce until it is over, whatever the
 * leg's row says, then the row holds it until a cleanup proves it dropped. The only place the
 * background reaches a secret key on its own: it waits for the login state to settle and treats a
 * locked wallet as a pause, never as an error.
 */
export const signAndBroadcast = async (ref: SwapPlanRef, built: BuiltLeg): Promise<SignOutcome> => {
  if (!(await isUnlocked())) return { type: "locked" }

  const leg = (await getDuePlan(ref))?.legs[ref.leg]
  if (!leg) return { type: "stale" }
  if (built.transaction.platform !== "ethereum")
    return { type: "failed", error: new Error("Only EVM legs are signed in the background") }
  const signer = leg.quote.signer
  if (!isEthereumAddress(signer))
    return { type: "failed", error: new Error("Invalid sender address") }

  const networkId = networkIdFromTokenId(leg.quote.fromTokenId)
  const reserved = leg.nonce === undefined
  const nonce = leg.nonce ?? (await getNextNonce(signer, networkId))
  const release = () => {
    if (reserved) releaseReservedNonce(signer, networkId, nonce)
  }

  const tx = toEip1559(built.transaction.transaction, Number(networkId), nonce)
  if (!tx) {
    release()
    return { type: "failed", error: new Error("The built transaction has no EIP-1559 fees") }
  }
  if (!(await getDuePlan(ref))) {
    release()
    return { type: "stale" }
  }

  const signed = await withSecretKey(signer, (secretKey) =>
    privateKeyToAccount(bytesToHex(secretKey)).signTransaction(tx)
  )
  if (!signed.ok) {
    release()
    return signed.val === "Unauthorised"
      ? { type: "locked" }
      : { type: "failed", error: signed.val }
  }
  const raw = signed.val
  const hash = keccak256(raw)

  const unsigned = serializeTransactionRequest({
    from: signer,
    to: tx.to,
    data: tx.data,
    value: tx.value,
    gas: tx.gas,
    maxFeePerGas: tx.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    nonce,
    type: "eip1559",
  })
  const txInfo = { ...built.txInfo, plan: ref }

  try {
    await admitEvmLeg(ref, { raw, networkId, unsigned, txInfo })
  } catch (err) {
    release()
    const name = (err as { name?: string }).name
    if (name === "PlanBoundViolation")
      return { type: "out-of-bounds", violation: getErrorMessage(err) }
    if (name === "PlanNotAdmissible") return { type: "stale" }
    return { type: "failed", error: err }
  }
  release()

  try {
    const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
    if (!client) throw new Error(`No client for network ${networkId}`)
    await client.sendRawTransaction({ serializedTransaction: raw })
  } catch (err) {
    if (!isBroadcastNoise(err))
      log.warn("Swap plan leg broadcast failed, observation decides", { err, hash })
  }

  watchEthereumTransaction(networkId, hash, unsigned, { notifications: true, txInfo })
  return { type: "sent", hash }
}
