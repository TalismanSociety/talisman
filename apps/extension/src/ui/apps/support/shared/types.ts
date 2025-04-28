export type TalismanJsonBackup = {
  isTalismanBackup: true
  version: string
  timestamp: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any
}
