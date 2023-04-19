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

    const chain = await chaindataProvider.getChain({ genesisHash })
    if (!chain) {
      log.error("Failed to fetch fee", { error: "Unable to find chain", chain })
      return
    }

    try {
      // sign based on current block from our RPC
      const [blockHash, runtimeVersion] = await Promise.all([
        chainConnector.send<string>(chain.id, "chain_getBlockHash", [], false),
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
