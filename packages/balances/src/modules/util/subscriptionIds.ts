const STORAGE_KEY = "TalismanBalancesSubscriptionIds"
const SESSION_KEY = "TalismanBalancesSubscriptionId"

export const getValidSubscriptionIds = () => {
  return new Set(localStorage.getItem(STORAGE_KEY)?.split?.(",")?.filter?.(Boolean) ?? [])
}
export const createSubscriptionId = () => {
  // delete current id (if exists)
  deleteSubscriptionId()

  // create new id
  const subscriptionId = Date.now().toString()
  sessionStorage.setItem(SESSION_KEY, subscriptionId)

  // add to list of current ids
  const subscriptionIds = getValidSubscriptionIds()
  subscriptionIds.add(subscriptionId)
  localStorage.setItem(
    STORAGE_KEY,
    [...subscriptionIds]
      .filter(Boolean)
      .filter((storageId) =>
        // filter super old IDs (they tend to stick around when the background script is restarted)
        //
        // test if the difference between `now` and `then` (subscriptionId - storageId) is greater than 1 week in milliseconds (604_800_000)
        // if so, `storageId` is definitely super old and we can just prune it from localStorage
        parseInt(subscriptionId, 10) - parseInt(storageId, 10) >= 604_800_000 ? false : true
      )
      .join(",")
  )

  return subscriptionId
}
export const deleteSubscriptionId = () => {
  const subscriptionId = sessionStorage.getItem(SESSION_KEY)
  if (!subscriptionId) return

  const subscriptionIds = getValidSubscriptionIds()
  subscriptionIds.delete(subscriptionId)
  localStorage.setItem(STORAGE_KEY, [...subscriptionIds].filter(Boolean).join(","))
}
