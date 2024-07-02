import { assert } from "@polkadot/util"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { sleep, throwAfter } from "@talismn/util"
import { log } from "extension-shared"
import { nanoid } from "nanoid"
import urlJoin from "url-join"
import { Hex, TransactionReceipt, TransactionRequest } from "viem"

import { sentry } from "../../config/sentry"
import { createNotification } from "../../notifications"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { settingsStore } from "../app/store.settings"
import { resetTransactionCount } from "../ethereum/transactionCountManager"
import { addEvmTransaction, updateTransactionStatus } from "./helpers"
import { WatchTransactionOptions } from "./types"

export const watchEthereumTransaction = async (
  evmNetworkId: EvmNetworkId,
  hash: `0x${string}`,
  unsigned: TransactionRequest<string>,
  options: WatchTransactionOptions = {}
) => {
  try {
    const { siteUrl, notifications, transferInfo = {} } = options
    const withNotifications = !!(notifications && (await settingsStore.get("allowNotifications")))

    const ethereumNetwork = await chaindataProvider.evmNetworkById(evmNetworkId)
    if (!ethereumNetwork) throw new Error(`Could not find ethereum network ${evmNetworkId}`)

    const client = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
    if (!client) throw new Error(`No client for network ${evmNetworkId} (${ethereumNetwork.name})`)

    const networkName = ethereumNetwork.name ?? "unknown network"
    const txUrl = ethereumNetwork.explorerUrl
      ? urlJoin(ethereumNetwork.explorerUrl, "tx", hash)
      : nanoid()

    // PENDING
    if (withNotifications) await createNotification("submitted", networkName, txUrl)

    try {
      await addEvmTransaction(evmNetworkId, hash, unsigned, { siteUrl, ...transferInfo })

      // Observed on polygon network (tried multiple rpcs) that waitForTransactionReceipt throws TransactionNotFoundError & BlockNotFoundError randomly
      // so we retry as long as we don't get a receipt, with a timeout on our side
      const getTransactionReceipt = async (hash: Hex): Promise<TransactionReceipt> => {
        try {
          return await client.waitForTransactionReceipt({ hash })
        } catch (err) {
          await sleep(4000)
          return getTransactionReceipt(hash)
        }
      }

      const receipt = await Promise.race([
        getTransactionReceipt(hash),
        throwAfter(5 * 60_000, "Transaction not found"),
      ])

      assert(receipt, "Transaction not found")
      // check hash which may be incorrect for cancelled tx, in which case receipt includes the replacement tx hash
      if (receipt.transactionHash === hash) {
        // to test failing transactions, swap on busy AMM pools with a 0.05% slippage limit
        updateTransactionStatus(
          hash,
          receipt.status === "success" ? "success" : "error",
          receipt.blockNumber
        )
      }

      if (withNotifications)
        await createNotification(
          receipt.status === "success" ? "success" : "error",
          networkName,
          txUrl
        )
    } catch (err) {
      log.error("watchEthereumTransaction error: ", { err })
      const isNotFound = err instanceof Error && err.message === "Transaction not found"

      // if not found, mark tx as unknown so user can still cancel/speed-up if necessary
      updateTransactionStatus(hash, isNotFound ? "unknown" : "error")

      // observed on polygon, some submitted transactions are not found, in which case we must reset the nonce counter to avoid being stuck
      resetTransactionCount(unsigned.from, evmNetworkId)

      if (withNotifications)
        await createNotification(
          isNotFound ? "not_found" : "error",
          networkName,
          txUrl,
          err as Error
        )
      // eslint-disable-next-line no-console
      else console.error("Failed to watch transaction", { err })
    }
  } catch (err) {
    sentry.captureException(err, { tags: { ethChainId: evmNetworkId } })
  }
}
