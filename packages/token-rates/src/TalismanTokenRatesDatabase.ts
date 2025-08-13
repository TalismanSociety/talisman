export const tryToDeleteOldTokenRatesDb = () => {
  try {
    // try and delete it if it's still there
    indexedDB.deleteDatabase("TalismanTokenRates")
  } catch {
    // dont care if it fails
  }
}
