import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type ManageProxyModalArgs = {
  /** Address of the wallet account whose proxies should be managed. */
  address: string
}

export const [useManageProxyModal] = createGlobalOpenClose<ManageProxyModalArgs>()
