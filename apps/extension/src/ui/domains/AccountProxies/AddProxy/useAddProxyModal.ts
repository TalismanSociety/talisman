import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type AddProxyModalArgs = {
  /** Address of the wallet account that will become the *real* (delegator). */
  address: string
}

export const [useAddProxyModal] = createGlobalOpenClose<AddProxyModalArgs>()
