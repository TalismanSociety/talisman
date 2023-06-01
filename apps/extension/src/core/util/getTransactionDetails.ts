/* eslint-disable no-console */
// TODO REMOVE eslint-disable BEFORE MERGE
import {
  SignerPayloadJSON,
  TransactionDetails,
  TransactionMethod,
  TransactionPayload,
} from "@core/domains/signing/types"
import { log } from "@core/log"
import { chainConnector } from "@core/rpcs/chain-connector"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { hexToNumber } from "@polkadot/util"
import * as Sentry from "@sentry/browser"

import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"
import { getRuntimeVersion } from "./getRuntimeVersion"
import { getTypeRegistry } from "./getTypeRegistry"

export const getTransactionDetails = async (payload: SignerPayloadJSON) => {
  const key = ` - ${Date.now()}`
  console.debug("entering getTransactionDetails")
  console.time("getTransactionDetails" + key)
  const { address, nonce, genesisHash, signedExtensions, specVersion: hexSpecVersion } = payload

  console.time("getTypeRegistry" + key)
  const { registry } = await getTypeRegistry(
    genesisHash,
    hexToNumber(hexSpecVersion),
    undefined, // dapp may be using an RPC that is a block ahead our provder's RPC, do not specify payload's blockHash or it could throw
    signedExtensions
  )
  console.timeEnd("getTypeRegistry" + key)

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

    const chain = await chaindataProvider.getChain({ genesisHash })
    if (!chain) {
      log.error("Failed to fetch fee", { error: "Unable to find chain", chain })
      return
    }

    try {
      console.time("get hash and runtime version" + key)
      // sign based on current block from our RPC
      const [blockHash, runtimeVersion] = await Promise.all([
        chainConnector.send<string>(chain.id, "chain_getBlockHash", [], false),
        getRuntimeVersion(chain.id),
      ])
      console.timeEnd("get hash and runtime version" + key)

      // fake sign it so fees can be queried
      extrinsic.signFake(address, { nonce, blockHash, genesisHash, runtimeVersion })

      console.time("get Fee" + key)
      const { partialFee } = await getExtrinsicDispatchInfo(chain.id, extrinsic)
      console.timeEnd("get Fee" + key)

      result.partialFee = partialFee
    } catch (err) {
      log.error("Failed to fetch fee", { err })
      Sentry.captureException(err)
    }
  } catch (err) {
    log.error("Invalid payload or metadata", { err })
  }
  console.timeEnd("getTransactionDetails" + key)
  return result as TransactionDetails
}
