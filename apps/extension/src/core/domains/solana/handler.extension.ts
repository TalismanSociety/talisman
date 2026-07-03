import { getBase64EncodedWireTransaction } from "@solana/kit"
import { stringifyJsonWithBigInts } from "@solana/rpc-spec-types"
import { base58, ed25519 } from "@talismn/crypto"
import {
  deserializeTransaction,
  parseTransactionInfo,
  serializeTransaction,
  signTransactionWithSecretKey,
} from "@talismn/solana"

import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { keyringStore } from "../keyring/store"
import { withSecretKey } from "../keyring/withSecretKey"
import { watchSolanaTransaction } from "../transactions/watchSolanaTransaction"
import type { RequestSolanaSignApprove } from "./types.extension"

export class SolanaExtensionHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    _id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType]
    // port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // substrate RPC handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(solana.rpc.send)": {
        const { networkId, request: req } = request as RequestTypes["pri(solana.rpc.send)"]
        const transport = await chainConnectorSol.getTransport(networkId)

        const body = await transport({ payload: { ...req, jsonrpc: "2.0" } })

        // response envelope is relayed as text: it may contain bigints, which cannot
        // cross the extension messaging boundary
        return { rawJson: stringifyJsonWithBigInts(body) }
      }

      case "pri(solana.rpc.submit)": {
        const { networkId, transaction, txInfo } = request as RequestTypes["pri(solana.rpc.submit)"]

        const tx = deserializeTransaction(transaction)
        const { address, signature } = parseTransactionInfo(tx)
        if (!address) throw new Error("Unknown signer")

        const account = await keyringStore.getAccount(address)
        if (!account) throw new Error("Account not found")

        const rpc = await chainConnectorSol.getRpc(networkId)

        // kit transactions are immutable - always reference the signed copy from here on
        let signed = tx
        if (!signature) {
          const signResult = await withSecretKey(account.address, async (secretKey) =>
            signTransactionWithSecretKey(tx, secretKey, address)
          )
          signed = signResult.unwrap()
        }

        const sig = await rpc
          .sendTransaction(getBase64EncodedWireTransaction(signed), {
            encoding: "base64",
            skipPreflight: true, // as we use public nodes, preflighting signed transactions is not recommended
          })
          .send()

        watchSolanaTransaction(networkId, signed, {
          txInfo,
          notifications: false,
        })

        return { signature: sig }
      }

      case "pri(solana.sign.approve)": {
        const req = request as RequestSolanaSignApprove
        const signRequest = requestStore.getRequest(req.id)
        if (!signRequest) throw new Error("Request not found")

        const dappRequest = signRequest.request

        switch (dappRequest.type) {
          case "message": {
            const { signature } = request as Extract<RequestSolanaSignApprove, { type: "message" }>
            if (signature) {
              if (
                !ed25519.verify(
                  base58.decode(signature),
                  base58.decode(dappRequest.message),
                  base58.decode(signRequest.account.address)
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
              }
            )

            return signRequest.resolve({
              type: "message",
              signature: base58.encode(signResult.unwrap()),
            })
          }
          case "transaction": {
            const { transaction, networkId } = request as Extract<
              RequestSolanaSignApprove,
              { type: "transaction" }
            >

            // if frontend sent a transaction, it might be already signed by ledger
            const tx = deserializeTransaction(transaction ?? dappRequest.transaction)
            const { signature } = parseTransactionInfo(tx)

            // kit transactions are immutable - always reference the signed copy from here on
            let signed = tx
            if (!signature) {
              const signResult = await withSecretKey(
                signRequest.account.address,
                async (secretKey) => signTransactionWithSecretKey(tx, secretKey)
              )
              signed = signResult.unwrap()
            }

            // `sendTransaction` returns the canonical transaction signature (its first, fee-payer
            // signature) - the exact value dapps expect back from signAndSendTransaction. Capturing
            // it here makes it the single source of truth: no second parse, no wire-byte extraction
            // fallback in the inject provider. `signature` is only read on the send path.
            let sentSignature: string | undefined
            if (dappRequest.send) {
              if (!networkId) throw new Error("Network ID is required for sending transactions")
              const rpc = await chainConnectorSol.getRpc(networkId)
              sentSignature = await rpc
                .sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64" })
                .send()
            }

            return signRequest.resolve({
              type: "transaction",
              transaction: serializeTransaction(signed),
              signature: sentSignature,
              networkId,
            })
          }
        }
      }
    }

    throw new Error(`Unable to handle message of type ${type}`)
  }
}
