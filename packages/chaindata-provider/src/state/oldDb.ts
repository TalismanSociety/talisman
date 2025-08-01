export const tryToDeleteOldChaindataDb = () => {
  try {
    // try and delete it if it's still there
    indexedDB.deleteDatabase("TalismanChaindataV4")
  } catch {
    // dont care if it fails
  }
}
