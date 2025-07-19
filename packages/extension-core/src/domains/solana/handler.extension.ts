import { getKeypair, solTransactionFromJson } from "@talismn/solana"

import { ExtensionHandler } from "../../libs/Handler"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { keyringStore } from "../keyring/store"
import { withSecretKey } from "../keyring/withSecretKey"
import { watchSolanaTransaction } from "../transactions/watchSolanaTransaction"

export class SolanaExtensionHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    // port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // substrate RPC handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(solana.rpc.send)": {
        const { networkId, request: req } = request as RequestTypes["pri(solana.rpc.send)"]
        const connection = await chainConnectorSol.getConnection(networkId)

        // TODO error handling
        return (
          connection as unknown as { _rpcRequest: (method: string, params: unknown[]) => unknown }
        )._rpcRequest(req.method, req.params)
      }

      case "pri(solana.rpc.submit)": {
        const { networkId, transaction, txInfo } = request as RequestTypes["pri(solana.rpc.submit)"]
        let { lastValidBlockHeight } = request as RequestTypes["pri(solana.rpc.submit)"]

        const tx = solTransactionFromJson(transaction)
        if (!tx.feePayer) throw new Error("Unknown signer")

        const account = await keyringStore.getAccount(tx.feePayer.toBase58())
        if (!account) throw new Error("Account not found")

        const connection = await chainConnectorSol.getConnection(networkId)

        // if tx is signed the lastValidBlockHeight will be supplied and we cant refresh it
        if (!lastValidBlockHeight) {
          // refresh blockhash and lastValidBlockHeight prior to signing
          const { blockhash, lastValidBlockHeight: lvbh } =
            await connection.getLatestBlockhash("confirmed")
          lastValidBlockHeight = lvbh
          tx.recentBlockhash = blockhash

          // sign
          await withSecretKey(account.address, async (secretKey) => {
            const keypair = getKeypair(secretKey)

            if (keypair.publicKey.toBase58() !== tx.feePayer?.toBase58())
              throw new Error("Address mismatch")

            tx.sign(keypair)
          })
        }

        if (!tx.verifySignatures(true)) throw new Error("Transaction signature verification failed")

        const sig = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: true, // as we use public nodes, preflighting signed transactions is not recommended
        })

        watchSolanaTransaction(networkId, tx, lastValidBlockHeight, {
          txInfo,
          notifications: false,
        })

        return { signature: sig }
      }
    }
    throw new Error(`Unable to handle message of type ${type} (substrate)`)
  }
}
