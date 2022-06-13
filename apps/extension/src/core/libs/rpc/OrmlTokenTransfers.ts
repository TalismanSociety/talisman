import { isHardwareAccount } from "@core/handlers/helpers"
import { db } from "@core/libs/dexieDb"
import RpcFactory from "@core/libs/RpcFactory"
import {
  Address,
  ChainId,
  ResponseAssetTransferFeeQuery,
  SignerPayloadJSON,
  SubscriptionCallback,
  TokenId,
} from "@core/types"
import { getMetadaRpc } from "@core/util/getMetadaRpc"
import { getRuntimeVersion } from "@core/util/getRuntimeVersion"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { KeyringPair } from "@polkadot/keyring/types"
import { TypeRegistry } from "@polkadot/types"
import { Extrinsic, ExtrinsicStatus } from "@polkadot/types/interfaces"
import * as Sentry from "@sentry/browser"
import { UnsignedTransaction, construct, defineMethod } from "@substrate/txwrapper-polkadot"

import { pendingTransfers } from "./PendingTransfers"

type ProviderSendFunction<T = any> = (method: string, params?: unknown[]) => Promise<T>

export default class OrmlTokenTransfersRpc {
  /**
   * Transfers an amount of an orml token from one account to another.
   *
   * @param chainId - The chain to make the transfer on.
   * @param tokenId - The token id to transfer.
   * @param amount - The amount of tokens to transfer.
   * @param from - An unlocked keypair of the sending account.
   * @param to - An address of the receiving account.
   * @param callback - A callback which will receive tx status updates.
   *                   It is automatically unsubscribed if an error occurs.
   *                   It is automatically unsubscribed when the tx is finalized.
   * @returns A promise which resolves once the tx is submitted (but before it is included in a block or finalized!)
   */
  static async transfer(
    chainId: ChainId,
    tokenId: TokenId,
    amount: string,
    from: KeyringPair,
    to: Address,
    tip: string,
    callback: SubscriptionCallback<{
      nonce: string
      hash: string
      status: ExtrinsicStatus
    }>
  ): Promise<void> {
    const { tx, registry } = await this.prepareTransaction(
      chainId,
      tokenId,
      amount,
      from,
      to,
      tip,
      true
    )

    const unsubscribe = await RpcFactory.subscribe(
      chainId,
      "author_submitAndWatchExtrinsic",
      "author_unwatchExtrinsic",
      "author_extrinsicUpdate",
      [tx.toHex()],
      (error, result) => {
        if (error) {
          callback(error)
          unsubscribe()
          return
        }

        const status = registry.createType<ExtrinsicStatus>("ExtrinsicStatus", result)
        callback(null, { nonce: tx.nonce.toString(), hash: tx.hash.toString(), status })

        if (status.isFinalized) unsubscribe()
      }
    )
  }

  /**
   * Calculates an estimated fee for transfering an amount of an orml token from one account to another.
   *
   * @param chainId - The chain to make the transfer on.
   * @param tokenId - The token id to transfer.
   * @param amount - The amount of tokens to transfer.
   * @param from - An unlocked keypair of the sending account.
   * @param to - An address of the receiving account.
   * @returns An object containing the calculated `partialFee` as returned from the `payment_queryInfo` rpc endpoint.
   */
  static async checkFee(
    chainId: ChainId,
    tokenId: TokenId,
    amount: string,
    from: KeyringPair,
    to: Address,
    tip: string
  ): Promise<ResponseAssetTransferFeeQuery> {
    const { tx, pendingTransferId, unsigned } = await this.prepareTransaction(
      chainId,
      tokenId,
      amount,
      from,
      to,
      tip,
      false
    )

    const { partialFee } = await RpcFactory.send(chainId, "payment_queryInfo", [tx.toHex()])

    return { partialFee, pendingTransferId, unsigned }
  }

  /**
   * Builds a signed orml token transfer transaction, ready for submission to the chain.
   *
   * @param chainId - The chain to make the transfer on.
   * @param tokenId - The token id to transfer.
   * @param amount - The amount of tokens to transfer.
   * @param from - An unlocked keypair of the sending account.
   * @param to - An address of the receiving account.
   * @returns An object containing:
   *          - `tx` the signed transaction.
   *          - `unsigned` the same transaction but without a signature.
   *          - `registry` a type registry containing metadata for the chain this transaction should be submitted to.
   */
  private static async prepareTransaction(
    chainId: ChainId,
    tokenId: TokenId,
    amount: string,
    from: KeyringPair,
    to: Address,
    tip: string,
    sign: boolean
  ): Promise<{
    tx: Extrinsic
    registry: TypeRegistry
    pendingTransferId?: string
    unsigned: SignerPayloadJSON
  }> {
    // TODO: validate
    // - existential deposit
    // - sufficient balance

    const chain = await db.chains.get(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)

    const token = await db.tokens.get(tokenId)
    if (!token) throw new Error(`Token ${tokenId} not found in store`)

    const send: ProviderSendFunction = (method, params = []) =>
      RpcFactory.send(chainId, method, params)

    const [{ block }, blockHash, genesisHash, metadataRpc, runtimeVersion, nonce, registry] =
      await Promise.all([
        send("chain_getBlock"),
        send("chain_getBlockHash"),
        send("chain_getBlockHash", [0]),
        getMetadaRpc(chainId),
        getRuntimeVersion(chainId),
        send("system_accountNextIndex", [from.address]),
        getTypeRegistry(chainId),
      ])

    const { specVersion, transactionVersion } = runtimeVersion

    let unsigned: UnsignedTransaction | undefined = undefined
    let errors: any[] = []

    // different chains use different orml transfer methods
    // we'll try each one in sequence until we get one that doesn't throw an error
    let unsignedMethods = [
      () =>
        defineMethod(
          {
            method: {
              pallet: "currencies",
              name: "transfer",
              args: {
                currencyId: { Token: token.symbol },
                amount,
                dest: to,
              },
            },
            address: from.address,
            blockHash,
            blockNumber: block.header.number,
            eraPeriod: 64,
            genesisHash,
            metadataRpc,
            nonce,
            specVersion: specVersion as unknown as number,
            tip: tip ? Number(tip) : 0,
            transactionVersion: transactionVersion as unknown as number,
          },
          {
            metadataRpc,
            registry,
          }
        ),
      () =>
        defineMethod(
          {
            method: {
              pallet: "tokens",
              name: "transfer",
              args: {
                currencyId: { Token: token.symbol },
                amount,
                dest: to,
              },
            },
            address: from.address,
            blockHash,
            blockNumber: block.header.number,
            eraPeriod: 64,
            genesisHash,
            metadataRpc,
            nonce,
            specVersion: specVersion as unknown as number,
            tip: tip ? Number(tip) : 0,
            transactionVersion: transactionVersion as unknown as number,
          },

          {
            metadataRpc,
            registry,
          }
        ),
    ]

    for (const method of unsignedMethods) {
      try {
        unsigned = method()
      } catch (error) {
        errors.push(error)
      }
    }

    if (unsigned === undefined) {
      errors.forEach((error) => Sentry.captureException(error))
      const userFacingError = new Error(`${token.symbol} transfers are not supported at this time.`)
      Sentry.captureException(userFacingError)
      throw userFacingError
    }

    // create the unsigned extrinsic
    const tx = registry.createType(
      "Extrinsic",
      { method: unsigned.method },
      { version: unsigned.version }
    )

    // create payload and export it in case it has to be signed by hardware device
    const payload = construct.signingPayload(unsigned, { registry })

    // if hardware account, signing has to be done on the device
    if (isHardwareAccount(unsigned.address)) {
      // store in pending transactions map
      const pendingTransferId = pendingTransfers.add({
        chainId,
        unsigned,
      })
      return { tx, registry, pendingTransferId, unsigned }
    }

    if (sign) {
      // create signable payload
      const signingPayload = registry.createType("ExtrinsicPayload", payload, { version: 4 })

      // sign it using keyring (will fail if keyring is locked or if address is from hardware device)
      const { signature } = signingPayload.sign(from)

      // apply signature
      tx.addSignature(unsigned.address, signature, unsigned)
    } else {
      // tx signed with fake signature for fee calculation
      tx.signFake(unsigned.address, { blockHash, genesisHash, nonce, runtimeVersion })
    }

    return { tx, registry, unsigned }
  }
}
