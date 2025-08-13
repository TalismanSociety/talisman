import EventEmitter from "events"

import type { SendRequest } from "extension-core"
import { SolanaSignInOutput } from "@solana/wallet-standard-features"
import { PublicKey } from "@solana/web3.js"
import bs58 from "bs58"

import { isVersionedTransaction } from "./solana"
import { deserializeTransaction, serializeTransaction } from "./util"
import { TalismanSol } from "./window"

export const getSolanaProvider = (send: SendRequest): TalismanSol => {
  const eventEmitter = new EventEmitter({ captureRejections: true })

  const provider: TalismanSol = {
    account: null,

    on: (event, listener, context) => {
      eventEmitter.on(event, listener.bind(context))
    },
    off: (event, listener, context) => {
      eventEmitter.off(event, listener.bind(context))
    },

    connect: async (options: { onlyIfTrusted?: boolean } = {}) => {
      const { account } = await send("pub(solana.provider.connect)", options)

      provider.account = account

      eventEmitter.emit("connect")

      return { publicKey: new PublicKey(account.address) }
    },
    disconnect: async () => {
      provider.account = null

      await send("pub(solana.provider.disconnect)", undefined)

      eventEmitter.emit("disconnect")
    },
    signAndSendTransaction: async (transaction, _options) => {
      const result = await send("pub(solana.provider.signTransaction)", {
        transaction: serializeTransaction(transaction),
        send: true,
      })
      const signed = deserializeTransaction(result.transaction) as typeof transaction

      const signature = isVersionedTransaction(signed)
        ? bs58.encode(signed.signatures[0])
        : bs58.encode(signed.signature!)

      return { signature }
    },
    signTransaction: async (transaction) => {
      const result = await send("pub(solana.provider.signTransaction)", {
        transaction: serializeTransaction(transaction),
        send: false,
      })
      return deserializeTransaction(result.transaction) as typeof transaction
    },
    signAllTransactions: async (transactions) => {
      const results: typeof transactions = []

      // sign each tx sequentially
      for (const tx of transactions) {
        const result = await send("pub(solana.provider.signTransaction)", {
          transaction: serializeTransaction(tx),
          send: false,
        })
        results.push(deserializeTransaction(result.transaction) as typeof tx)
      }
      return results
    },
    signMessage: async (message) => {
      if (!provider.account) throw new Error("No solana account connected")

      const result = await send("pub(solana.provider.signMessage)", {
        address: provider.account.address,
        message: bs58.encode(message),
      })

      return { signature: bs58.decode(result.signature) }
    },
    signIn: async (input) => {
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
