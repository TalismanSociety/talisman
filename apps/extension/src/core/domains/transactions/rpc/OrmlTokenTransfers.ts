import { DEBUG } from "@core/constants"
import { ChainId } from "@core/domains/chains/types"
import { SignerPayloadJSON } from "@core/domains/signing/types"
import { TokenId } from "@core/domains/tokens/types"
import { ResponseAssetTransferFeeQuery } from "@core/domains/transactions/types"
import { isHardwareAccount } from "@core/handlers/helpers"
import { db } from "@core/libs/db"
import RpcFactory from "@core/libs/RpcFactory"
import { SubscriptionCallback } from "@core/types"
import { Address } from "@core/types/base"
import { getRuntimeVersion } from "@core/util/getRuntimeVersion"
import { getExtrinsicDispatchInfo } from "@core/util/getExtrinsicDispatchInfo"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { KeyringPair } from "@polkadot/keyring/types"
import { TypeRegistry } from "@polkadot/types"
import { Extrinsic, ExtrinsicStatus } from "@polkadot/types/interfaces"
import { assert } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import { UnsignedTransaction, construct, defineMethod } from "@substrate/txwrapper-core"

import { pendingTransfers } from "./PendingTransfers"

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
   * Calculates an estimated fee for transferring an amount of an orml token from one account to another.
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

    const { partialFee } = await getExtrinsicDispatchInfo(chainId, tx)

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
    if (!chain?.genesisHash) throw new Error(`Chain ${chainId} not found in store`)
    const { genesisHash } = chain

    const token = await db.tokens.get(tokenId)
    if (!token) throw new Error(`Token ${tokenId} not found in store`)

    const [blockHash, { block }, nonce, runtimeVersion] = await Promise.all([
      RpcFactory.send(chainId, "chain_getBlockHash", [], false),
      RpcFactory.send(chainId, "chain_getBlock", [], false),
      RpcFactory.send(chainId, "system_accountNextIndex", [from.address]),
      getRuntimeVersion(chainId),
    ])

    const { specVersion, transactionVersion } = runtimeVersion

    // this is quick if metadataRpc is already up to date
    const { registry, metadataRpc } = await getTypeRegistry(chainId, specVersion, blockHash)
    assert(metadataRpc, "Could not fetch metadata")

    let unsigned: UnsignedTransaction | undefined = undefined
    const errors: Error[] = []

    const hardcodedCurrencyIds: Record<string, any> = {
      "mangata-orml-mgx": 0,
      "gm-orml-gm": 1,
      "gm-orml-gn": 2,
    }

    // different chains use different orml transfer methods
    // we'll try each one in sequence until we get one that doesn't throw an error
    const currencyId = hardcodedCurrencyIds[token.id] ?? { Token: token.symbol.toUpperCase() }
    const unsignedMethods = [
      () =>
        defineMethod(
          {
            method: {
              pallet: "currencies",
              name: "transfer",
              args: {
                currencyId,
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
                currencyId,
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
      } catch (error: unknown) {
        errors.push(error as Error)
      }
    }

    if (unsigned === undefined) {
      const sentryExtra = errors.map((error) => {
        DEBUG && console.error(error) // eslint-disable-line no-console
        return error.message
      })
      const userFacingError = new Error(`${token.symbol} transfers are not supported at this time.`)
      Sentry.captureException(userFacingError, { extra: { errors: sentryExtra } })
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
