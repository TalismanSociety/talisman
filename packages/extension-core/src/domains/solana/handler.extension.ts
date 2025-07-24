import { PublicKey, VersionedTransaction } from "@solana/web3.js"
import { base58, ed25519 } from "@talismn/crypto"
import { getKeypair, solTransactionFromJson } from "@talismn/solana"

import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
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

        const tx = solTransactionFromJson(transaction)
        if (!tx.feePayer) throw new Error("Unknown signer")

        const account = await keyringStore.getAccount(tx.feePayer.toBase58())
        if (!account) throw new Error("Account not found")

        const connection = await chainConnectorSol.getConnection(networkId)

        if (!tx.signature) {
          // refresh blockhash and lastValidBlockHeight prior to signing
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed")
          tx.recentBlockhash = blockhash
          tx.lastValidBlockHeight = lastValidBlockHeight

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

        watchSolanaTransaction(networkId, tx, {
          txInfo,
          notifications: false,
        })

        return { signature: sig }
      }

      case "pri(solana.sign.approve)": {
        const { id, signature } = request as RequestTypes["pri(solana.sign.approve)"]
        const signRequest = requestStore.getRequest(id)
        if (!signRequest) throw new Error("Request not found")

        const dappRequest = signRequest.request

        switch (dappRequest.type) {
          case "message": {
            if (signature) {
              if (
                !ed25519.verify(
                  base58.decode(signature),
                  base58.decode(dappRequest.message),
                  base58.decode(signRequest.account.address),
                )
              )
                throw new Error("Signature verification failed")

              // if signature is supplied, we assume it was signed with a hardware device
              return signRequest.resolve({
                type: "message",
                signature,
              })
            }

            const signResult = await withSecretKey(
              signRequest.account.address,
              async (secretKey) => {
                const payload = base58.decode(dappRequest.message)
                return ed25519.sign(payload, secretKey)
              },
            )

            signRequest.resolve({
              type: "message",
              signature: base58.encode(signResult.unwrap()),
            })

            return
          }
          case "transaction": {
            const tx = VersionedTransaction.deserialize(base58.decode(dappRequest.transaction))

            if (signature) {
              tx.addSignature(new PublicKey(signRequest.account.address), base58.decode(signature))
            } else {
              await withSecretKey(signRequest.account.address, async (secretKey) => {
                const keypair = getKeypair(secretKey)
                tx.sign([keypair])
              })
            }

            if (dappRequest.send) {
              const connection = await chainConnectorSol.getConnection("solana-mainnet")
              await connection.sendTransaction(tx, {
                skipPreflight: true,
              })
            }

            signRequest.resolve({
              type: "transaction",
              transaction: base58.encode(tx.serialize()),
            })
          }
        }
      }
    }
    throw new Error(`Unable to handle message of type ${type}`)
  }
}
