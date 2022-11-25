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
import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"
import { getRuntimeVersion } from "./getRuntimeVersion"
import { getTypeRegistry } from "./getTypeRegistry"

export const getTransactionDetails = async (payload: SignerPayloadJSON) => {
  const { address, nonce, genesisHash, signedExtensions, specVersion: hexSpecVersion } = payload

  const { registry } = await getTypeRegistry(
    genesisHash,
    hexToNumber(hexSpecVersion),
    undefined, // dapp may be using an RPC that is a block ahead our provder's RPC, do not specify payload's blockHash or it could throw
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
    const extrinsic = registry.createType("Extrinsic", payload)

    try {
      const { method } = extrinsic.toHuman(true) as { method: TransactionMethod }
      result.method = method
    } catch (err) {
      log.error("Failed to decode method", { err })
    }

    try {
      const chain = await db.chains.get({ genesisHash })
      assert(chain, "Unable to find chain")

      // sign based on current block from our RPC
      const [blockHash, runtimeVersion] = await Promise.all([
        RpcFactory.send<string>(chain.id, "chain_getBlockHash", [], false),
        getRuntimeVersion(chain.id),
      ])

      // fake sign it so fees can be queried
      extrinsic.signFake(address, { nonce, blockHash, genesisHash, runtimeVersion })

      const { partialFee } = await getExtrinsicDispatchInfo(chain.id, extrinsic)

      result.partialFee = partialFee
    } catch (err) {
      log.error("Failed to fetch fee", { err })
      Sentry.captureException(err)
    }
  } catch (err) {
    log.error("Invalid payload or metadata", { err })
  }

  return result as TransactionDetails
}
