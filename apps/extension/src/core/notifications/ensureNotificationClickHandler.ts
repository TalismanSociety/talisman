import Browser from "webextension-polyfill"

const onNotificationClicked = (notificationId: string) => {
  // we actually use an url as identifier, redirect to it
  try {
    new URL(notificationId)
    Browser.tabs.create({ url: notificationId })
  } catch {
    // no problem, just means notificationId is not a valid url
    return
  }
}

export const ensureNotificationClickHandler = () => {
  if (!Browser.notifications.onClicked.hasListener(onNotificationClicked))
    Browser.notifications.onClicked.addListener(onNotificationClicked)
}
