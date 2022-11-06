import {
  SignerPayloadJSON,
  TransactionMethod,
  TransactionDetails,
  TransactionPayload,
} from "@core/domains/signing/types"
import { db } from "@core/libs/db"
import RpcFactory from "@core/libs/RpcFactory"
import { log } from "@core/log"
import { assert, hexToNumber } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import { getRuntimeVersion } from "./getRuntimeVersion"
import { getTypeRegistry } from "./getTypeRegistry"

import { sleep } from "./sleep"

const tryRpcSend = async (chainId: string, method: string, params: unknown[], attempts: number) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await RpcFactory.send(chainId, method, params)
    } catch (err) {
      if (i === attempts) throw err
      await sleep(300)
    }
  }
}

export const getTransactionDetails = async (payload: SignerPayloadJSON) => {
  const {
    address,
    nonce,
    blockHash,
    genesisHash,
    signedExtensions,
    specVersion: hexSpecVersion,
  } = payload

  const { registry } = await getTypeRegistry(
    genesisHash,
    hexToNumber(hexSpecVersion),
    blockHash,
    signedExtensions
  )

  const result = {} as TransactionDetails

  try {
    const typedPayload = registry.createType("ExtrinsicPayload", payload)

    result.payload = typedPayload.toHuman() as TransactionPayload
  } catch (err) {
    log.error("failed to decode payload", { err })
  }

  try {
    // convert to extrinsic
    const extrinsic = registry.createType("Extrinsic", payload) // payload as UnsignedTransaction

    try {
      const { method } = extrinsic.toHuman(true) as { method: TransactionMethod }
      result.method = method
    } catch (err) {
      log.error("Failed to decode method", { err })
    }

    try {
      const chain = await db.chains.get({ genesisHash })
      assert(chain, "Unable to find chain")

      const runtimeVersion = await getRuntimeVersion(chain.id, blockHash)

      // fake sign it so fees can be queried
      extrinsic.signFake(address, { nonce, blockHash, genesisHash, runtimeVersion })

      // estimate fees (attempt 3 times)
      const payment = await tryRpcSend(
        chain.id,
        "payment_queryInfo",
        [extrinsic.toHex(), blockHash],
        3
      )

      result.partialFee = payment.partialFee
    } catch (err) {
      log.error("Failed to fetch fee", { err })
      Sentry.captureException(err)
    }
  } catch (err) {
    log.error("Invalid payload or metadata", { err })
  }

  return result as TransactionDetails
}
