/* eslint-disable no-console */
import EventEmitter from "events"

import type { SendRequest } from "extension-core"
import { SolanaSignInOutput } from "@solana/wallet-standard-features"
import { PublicKey } from "@solana/web3.js"
import { sleep } from "@talismn/util"
import bs58 from "bs58"

import { deserializeTransaction, serializeTransaction } from "./util"
import { TalismanSol } from "./window"

export const getSolanaProvider = (send: SendRequest): TalismanSol => {
  console.log("[provider] getSolanaProvider", { send })
  const eventEmitter = new EventEmitter({ captureRejections: true })

  const provider: TalismanSol = {
    account: null,

    on: (event, listener, context) => {
      console.log("[provider] on", { event, listener, context })
      eventEmitter.on(event, listener.bind(context))
    },
    off: (event, listener, context) => {
      console.log("[provider] off", { event, listener, context })
      eventEmitter.off(event, listener.bind(context))
    },

    connect: async (options?: { onlyIfTrusted?: boolean }) => {
      console.log("[provider] connect", { options })

      const { account } = await send("pub(solana.provider.connect)", undefined)
      console.log("[provider] connect response", { account })

      provider.account = account

      eventEmitter.emit("connect")

      return { publicKey: new PublicKey(account.address) }
    },
    disconnect: async () => {
      // TODO unregister emitter listeners ?
      console.log("[provider] disconnect")

      provider.account = null

      await send("pub(solana.provider.disconnect)", undefined)

      eventEmitter.emit("disconnect")
    },
    signAndSendTransaction: async (transaction, options) => {
      console.log("[provider] signAndSendTransaction", { transaction, options })
      // const response = await send("solana_signAndSendTransaction", { transaction, options });
      return { signature: "" }
    },
    signTransaction: async (transaction) => {
      const result = await send("pub(solana.provider.signTransaction)", {
        transaction: serializeTransaction(transaction),
        send: false,
      })
      console.log("[provider] signTransaction", { transaction, result })
      const deserialized = deserializeTransaction(result.transaction)
      console.log("[provider] signTransaction deserialized", { deserialized })

      return deserialized as typeof transaction
    },
    signAllTransactions: async (transactions) => {
      console.log("[provider] signAllTransactions", { transactions })
      await sleep(200)
      return transactions
    },
    signMessage: async (message) => {
      console.log("[provider] signMessage", { message })
      if (!provider.account) throw new Error("No solana account connected")

      const result = await send("pub(solana.provider.signMessage)", {
        address: provider.account.address,
        message: bs58.encode(message),
      })

      console.log("[provider] signMessage response", { message, result })

      return { signature: bs58.decode(result.signature) }
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

      provider.account = output.account

      eventEmitter.emit("connect")

      return output
    },
  }

  // subscribe to extension events for this site
  send("pub(solana.provider.subscribe)", null, (ev) => {
    console.log("[provider] received event", { ev })
    switch (ev.type) {
      case "accountChanged": {
        provider.account = ev.account
        eventEmitter.emit("accountChanged")
        break
      }
      case "connect": {
        provider.account = ev.account
        eventEmitter.emit("connect")
        break
      }
      case "disconnect": {
        provider.account = null
        eventEmitter.emit("disconnect")
      }
    }
  })

  return provider
}
