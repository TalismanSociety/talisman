/* eslint-disable no-console */
import EventEmitter from "events"

import type { SendRequest } from "extension-core"
import { SolanaSignInOutput } from "@solana/wallet-standard-features"
import { PublicKey } from "@solana/web3.js"
import { sleep } from "@talismn/util"
import bs58 from "bs58"

import { TalismanSol } from "./window"

export const getSolanaProvider = (send: SendRequest): TalismanSol => {
  console.log("[provider] getSolanaProvider", { send })
  const eventEmitter = new EventEmitter({ captureRejections: true })

  const provider: TalismanSol = {
    publicKey: null,

    on: (event, listener, context) => {
      eventEmitter.on(event, listener.bind(context))
    },
    off: (event, listener, context) => {
      eventEmitter.off(event, listener.bind(context))
    },

    connect: async (options?: { onlyIfTrusted?: boolean }) => {
      console.log("[provider] connect", { options })

      const { address } = await send("pub(solana.provider.connect)", undefined)
      console.log("[provider] connect response", { address })

      const publicKey = new PublicKey(address)

      // TODO register emitter listeners ?

      provider.publicKey = publicKey
      return { publicKey }
    },
    disconnect: async () => {
      // TODO unregister emitter listeners ?
      console.log("[provider] disconnect")

      await sleep(200)
      provider.publicKey = null
    },
    signAndSendTransaction: async (transaction, options) => {
      console.log("[provider] signAndSendTransaction", { transaction, options })
      // const response = await send("solana_signAndSendTransaction", { transaction, options });
      return { signature: "" }
    },
    signTransaction: async (transaction) => {
      console.log("[provider] signTransaction", { transaction })
      await sleep(200)
      return transaction
    },
    signAllTransactions: async (transactions) => {
      console.log("[provider] signAllTransactions", { transactions })
      await sleep(200)
      return transactions
    },
    signMessage: async (message) => {
      console.log("[provider] signMessage", { message })
      await sleep(200)
      return { signature: new Uint8Array() }
    },
    signIn: async (input) => {
      console.log("[provider] signIn", { input })

      // SolanaSignInOutput contains field that are not serializable
      // => backend returns a result with some base58 encoded fields
      const result = await send("pub(solana.provider.signIn)", { input })

      const output: SolanaSignInOutput = {
        account: {
          ...result.account,
          publicKey: bs58.decode(result.account.address),
        },
        signature: bs58.decode(result.signature),
        signedMessage: bs58.decode(result.signedMessage),
        signatureType: "ed25519",
      }

      provider.publicKey = new PublicKey(output.account.publicKey)

      // console.debug("[provider] signIn response", { output })

      return output
    },
  }

  return provider
}
