import Browser from "webextension-polyfill"
import { ethereumNetworkStore, getProviderForEthereumNetwork } from "./networksStore"
import urlJoin from "url-join"
import { nanoid } from "nanoid"
import { TransactionNotOkIcon, TransactionOkIcon } from "@talisman/theme/icons"
import * as Sentry from "@sentry/browser"

const onNotificationClicked = (notificationId: string) => {
  // we actually use an url as identifier, redirect to it
  if (notificationId.startsWith("https://")) Browser.tabs.create({ url: notificationId })
}

const init = () => {
  if (!Browser.notifications.onClicked.hasListener(onNotificationClicked))
    Browser.notifications.onClicked.addListener(onNotificationClicked)
}

export const watchEthereumTransaction = async (ethChainId: number, txHash: string) => {
  let txUrl: string | undefined
  try {
    const ethereumNetwork = await ethereumNetworkStore.ethereumNetwork(ethChainId)
    if (!ethereumNetwork) {
      throw new Error(`Could not find ethereum network ${ethChainId}`)
    }

    const provider = getProviderForEthereumNetwork(ethereumNetwork)
    if (!provider) {
      throw new Error(`No provider for network ${ethChainId} (${ethereumNetwork.name})`)
    }

    // handle notification click
    init()

    txUrl =
      ethereumNetwork.explorerUrls.length > 0
        ? urlJoin(ethereumNetwork.explorerUrls[0], "tx", txHash)
        : nanoid()

    // PENDING
    await Browser.notifications.create(txUrl, {
      type: "basic",
      title: "👀 Transaction submitted 🧐",
      message: `Waiting on transaction confirmation on ${ethereumNetwork.name}.`,
      iconUrl: TransactionOkIcon,
    })

    const receipt = await provider.waitForTransaction(txHash, 2)

    if (receipt.blockNumber) {
      // SUCCESS
      await Browser.notifications.create(txUrl, {
        type: "basic",
        title: "✅ Transaction confirmed ⭐",
        message: `Your transaction on ${ethereumNetwork.name} has been confirmed.`,
        iconUrl: TransactionOkIcon,
      })
    } else {
      // FAILED
      throw new Error(`Your transaction on ${ethereumNetwork.name} has been confirmed.`)
    }
  } catch (err) {
    try {
      const error = err as any
      await Browser.notifications.create(txUrl ?? nanoid(), {
        type: "basic",
        title: "❌ Transaction failed 😵",
        message: error?.reason || error?.message || "Unknown error",
        iconUrl: TransactionNotOkIcon,
      })
    } catch (err2) {
      Sentry.captureException(err2)
    }
  }
}
