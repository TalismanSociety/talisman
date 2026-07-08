import type { SendRequest } from "@core/types"
import type { SolanaSignInOutput } from "@solana/wallet-standard-features"
import bs58 from "bs58"
import { EventEmitter } from "inject/shared/EventEmitter"

import type { TalismanSol } from "./window"

export const getSolanaProvider = (send: SendRequest): TalismanSol => {
  const eventEmitter = new EventEmitter()

  const provider: TalismanSol = {
    account: null,

    on: (event, listener, context) => {
      eventEmitter.on(event, listener, context)
    },
    off: (event, listener) => {
      eventEmitter.off(event, listener)
    },

    connect: async (options: { onlyIfTrusted?: boolean } = {}) => {
      const { account } = await send("pub(solana.provider.connect)", options)

      provider.account = account

      eventEmitter.emit("connect")

      return { publicKey: bs58.decode(account.address) }
    },
    disconnect: async () => {
      provider.account = null

      await send("pub(solana.provider.disconnect)", undefined)

      eventEmitter.emit("disconnect")
    },
    signAndSendTransaction: async (transaction, _options) => {
      const result = await send("pub(solana.provider.signTransaction)", {
        transaction: bs58.encode(transaction),
        send: true,
      })

      // the backend always returns the canonical signature for a sent transaction
      if (!result.signature) throw new Error("No signature returned for sent transaction")

      return { signature: result.signature }
    },
    signTransaction: async (transaction) => {
      const result = await send("pub(solana.provider.signTransaction)", {
        transaction: bs58.encode(transaction),
        send: false,
      })
      return bs58.decode(result.transaction)
    },
    signAllTransactions: async (transactions) => {
      const results: Uint8Array[] = []

      // sign each tx sequentially
      for (const tx of transactions) {
        const result = await send("pub(solana.provider.signTransaction)", {
          transaction: bs58.encode(tx),
          send: false,
        })
        results.push(bs58.decode(result.transaction))
      }
      return results
    },
    signMessage: async (message) => {
      if (!provider.account) throw new Error("No solana account connected")

      const result = await send("pub(solana.provider.signMessage)", {
        address: provider.account.address,
        message: bs58.encode(message),
      })

      return {
        signature: bs58.decode(result.signature),
        // hardware devices sign the off-chain message envelope instead of the raw bytes
        signedMessage: result.signedMessage ? bs58.decode(result.signedMessage) : undefined,
      }
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
