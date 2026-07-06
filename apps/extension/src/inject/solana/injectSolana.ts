import type { SendRequest } from "@core/types"

import { getSolanaProvider } from "./provider"
import { registerWallet } from "./register"
import { TalismanSolWallet } from "./wallet"

export const injectSolana = (send: SendRequest): void => {
  // provider handles the messaging with our solana backend handler
  const provider = getSolanaProvider(send)

  // create wallet-standard compliant object
  const wallet = new TalismanSolWallet(provider)

  // register the wallet in the page
  registerWallet(wallet)
}
