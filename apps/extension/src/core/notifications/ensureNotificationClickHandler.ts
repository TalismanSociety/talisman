const onNotificationClicked = (notificationId: string) => {
  // we actually use an url as identifier, redirect to it
  try {
    new URL(notificationId)
    chrome.tabs.create({ url: notificationId })
  } catch {
    // no problem, just means notificationId is not a valid url
    return
  }
}

export const ensureNotificationClickHandler = () => {
  if (!chrome.notifications.onClicked.hasListener(onNotificationClicked))
    chrome.notifications.onClicked.addListener(onNotificationClicked)
}
