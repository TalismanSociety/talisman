import Browser from "webextension-polyfill"

const onNotificationClicked = (notificationId: string) => {
  // we actually use an url as identifier, redirect to it
  if (notificationId.startsWith("https://")) Browser.tabs.create({ url: notificationId })
}

export const ensureNotificationClickHandler = () => {
  if (!Browser.notifications.onClicked.hasListener(onNotificationClicked))
    Browser.notifications.onClicked.addListener(onNotificationClicked)
}
