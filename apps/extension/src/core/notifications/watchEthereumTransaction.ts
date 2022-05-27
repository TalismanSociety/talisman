import Browser from "webextension-polyfill"
import {
  ethereumNetworkStore,
  getProviderForEthereumNetwork,
} from "../domains/ethereum/networksStore"
import { nanoid } from "nanoid"
import * as Sentry from "@sentry/browser"
import urlJoin from "url-join"

const onNotificationClicked = (notificationId: string) => {
  // we actually use an url as identifier, redirect to it
  if (notificationId.startsWith("https://")) Browser.tabs.create({ url: notificationId })
}

const ensureNotificationClickHandler = () => {
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

    ensureNotificationClickHandler()

    txUrl =
      ethereumNetwork.explorerUrls.length > 0
        ? urlJoin(ethereumNetwork.explorerUrls[0], "tx", txHash)
        : nanoid()

    // PENDING
    const notificationId = await Browser.notifications.create(txUrl, {
      type: "basic",
      title: "👀 Transaction submitted 🧐",
      message: `Waiting on transaction confirmation on ${ethereumNetwork.name}.`,
      iconUrl: "/images/tx-ok.png",
    })

    const receipt = await provider.waitForTransaction(txHash)

    // delete previous notification before creating a new one, to make sure user sees the toast
    await Browser.notifications.clear(notificationId)

    if (receipt.blockNumber) {
      // SUCCESS
      await Browser.notifications.create(txUrl, {
        type: "basic",
        title: "✅ Transaction confirmed ⭐",
        message: `Your transaction on ${ethereumNetwork.name} has been confirmed.`,
        iconUrl: "/images/tx-ok.png",
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
        iconUrl: "/images/tx-nok.png",
      })
    } catch (err2) {
      Sentry.captureException(err2)
    }
  }
}
