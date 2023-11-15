import * as Sentry from "@sentry/browser"
import Browser from "webextension-polyfill"

import { ensureNotificationClickHandler } from "./ensureNotificationClickHandler"

export type NotificationType = "submitted" | "success" | "error"

const getNotificationOptions = (
  type: NotificationType,
  networkName: string,
  error?: Error & { shortMessage?: string; reason?: string }
): Browser.Notifications.CreateNotificationOptions => {
  switch (type) {
    case "submitted":
      return {
        type: "basic",
        title: "Transaction in progress",
        message: `Waiting on transaction confirmation on ${networkName}.`,
        iconUrl: "/images/tx-ok.png",
      }
    case "success":
      return {
        type: "basic",
        title: "Transaction successful",
        message: `Your transaction on ${networkName} has been confirmed.`,
        iconUrl: "/images/tx-ok.png",
      }
    case "error":
      return {
        type: "basic",
        title: "Transaction failed",
        message:
          error?.shortMessage ??
          error?.reason ??
          error?.message ??
          `Failed transaction on ${networkName}.`,
        iconUrl: "/images/tx-nok.png",
      }
  }
}

export const createNotification = async (
  type: NotificationType,
  networkName: string,
  url: string,
  error?: Error
) => {
  try {
    ensureNotificationClickHandler()

    // we use url as notification id
    // delete previous notification before creating a new one, to make sure user sees the toast

    if (url) await Browser.notifications.clear(url)

    const options = getNotificationOptions(type, networkName, error)
    await Browser.notifications.create(url, options)
  } catch (err) {
    Sentry.captureException(err)
  }
}
