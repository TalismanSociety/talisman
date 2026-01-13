export type TalismanJsonBackup = {
  isTalismanBackup: true
  version: string
  timestamp: number
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  storage: any
}
