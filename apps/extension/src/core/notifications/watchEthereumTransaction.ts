import { chaindataProvider } from "@core/rpcs/chaindata"
import * as Sentry from "@sentry/browser"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { nanoid } from "nanoid"
import urlJoin from "url-join"

import { getProviderForEthereumNetwork } from "../domains/ethereum/rpcProviders"
import { createNotification } from "./createNotification"

export const watchEthereumTransaction = async (ethChainId: EvmNetworkId, txHash: string) => {
  try {
    const ethereumNetwork = await chaindataProvider.getEvmNetwork(ethChainId)
    if (!ethereumNetwork) throw new Error(`Could not find ethereum network ${ethChainId}`)

    const provider = await getProviderForEthereumNetwork(ethereumNetwork, { batch: true })
    if (!provider)
      throw new Error(`No provider for network ${ethChainId} (${ethereumNetwork.name})`)

    const networkName = ethereumNetwork.name ?? "unknown network"
    const txUrl = ethereumNetwork.explorerUrl
      ? urlJoin(ethereumNetwork.explorerUrl, "tx", txHash)
      : nanoid()

    // PENDING
    await createNotification("submitted", networkName, txUrl)

    try {
      const receipt = await provider.waitForTransaction(txHash)

      // status 0 = error
      // status 1 = ok
      // easy to test on busy AMM pools with a 0.05% slippage limit

      // success if associated to a block number
      await createNotification(
        receipt.blockNumber && receipt.status ? "success" : "error",
        networkName,
        txUrl
      )
    } catch (err) {
      await createNotification("error", networkName, txUrl, err as Error)
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { ethChainId } })
  }
}
