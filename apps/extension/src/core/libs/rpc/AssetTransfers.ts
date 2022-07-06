import { isHardwareAccount } from "@core/handlers/helpers"
import RpcFactory from "@core/libs/RpcFactory"
import {
  Address,
  ChainId,
  ResponseAssetTransferFeeQuery,
  SignerPayloadJSON,
  SubscriptionCallback,
} from "@core/types"
import { getMetadataRpc } from "@core/util/getMetadataRpc"
import { getRuntimeVersion } from "@core/util/getRuntimeVersion"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { KeyringPair } from "@polkadot/keyring/types"
import { TypeRegistry } from "@polkadot/types"
import { Extrinsic, ExtrinsicStatus } from "@polkadot/types/interfaces"
import { construct, methods } from "@substrate/txwrapper-polkadot"

import { pendingTransfers } from "./PendingTransfers"

type ProviderSendFunction<T = any> = (method: string, params?: unknown[]) => Promise<T>

export default class AssetTransfersRpc {
  /**
   * Transfers an amount of nativeToken from one account to another.
   *
   * @param chainId - The chain to make the transfer on.
   * @param amount - The amount of `nativeToken` to transfer.
   * @param from - An unlocked keypair of the sending account.
   * @param to - An address of the receiving account.
   * @param callback - A callback which will receive tx status updates.
   *                   It is automatically unsubscribed if an error occurs.
   *                   It is automatically unsubscribed when the tx is finalized.
   * @returns A promise which resolves once the tx is submitted (but before it is included in a block or finalized!)
   */
  static async transfer(
    chainId: ChainId,
    amount: string,
    from: KeyringPair,
    to: Address,
    tip: string,
    reapBalance = false,
    callback: SubscriptionCallback<{
      nonce: string
      hash: string
      status: ExtrinsicStatus
    }>
  ): Promise<void> {
    const { tx, registry } = await this.prepareTransaction(
      chainId,
      amount,
      from,
      to,
      tip,
      reapBalance,
      true
    )

    callback(null, {
      nonce: tx.nonce.toString(),
      hash: tx.hash.toString(),
      status: registry.createType<ExtrinsicStatus>("ExtrinsicStatus", { future: true }),
    })

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
   * Calculates an estimated fee for transfering an amount of nativeToken from one account to another.
   *
   * @param chainId - The chain to make the transfer on.
   * @param amount - The amount of `nativeToken` to transfer.
   * @param from - An unlocked keypair of the sending account.
   * @param to - An address of the receiving account.
   * @returns An object containing the calculated `partialFee` as returned from the `payment_queryInfo` rpc endpoint.
   */
  static async checkFee(
    chainId: ChainId,
    amount: string,
    from: KeyringPair,
    to: Address,
    tip: string,
    reapBalance = false
  ): Promise<ResponseAssetTransferFeeQuery> {
    const { tx, pendingTransferId, unsigned } = await this.prepareTransaction(
      chainId,
      amount,
      from,
      to,
      tip,
      reapBalance,
      false
    )

    const { partialFee } = await RpcFactory.send(chainId, "payment_queryInfo", [tx.toHex()])

    return { partialFee, pendingTransferId, unsigned }
  }

  /**
   * Builds a signed asset transfer transaction, ready for submission to the chain.
   *
   * @param chainId - The chain to make the transfer on.
   * @param amount - The amount of `nativeToken` to transfer.
   * @param from - An unlocked keypair of the sending account.
   * @param to - An address of the receiving account.
   * @returns An object containing:
   *          - `tx` the signed transaction.
   *          - `unsigned` the same transaction but without a signature.
   *          - `registry` a type registry containing metadata for the chain this transaction should be submitted to.
   */
  private static async prepareTransaction(
    chainId: ChainId,
    amount: string,
    from: KeyringPair,
    to: Address,
    tip: string,
    reapBalance: boolean,
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

    const send: ProviderSendFunction = (method, params = []) =>
      RpcFactory.send(chainId, method, params)

    const [{ block }, blockHash, genesisHash, metadataRpc, runtimeVersion, nonce, registry] =
      await Promise.all([
        send("chain_getBlock"),
        send("chain_getBlockHash"),
        send("chain_getBlockHash", [0]),
        getMetadataRpc(chainId),
        getRuntimeVersion(chainId),
        send("system_accountNextIndex", [from.address]),
        getTypeRegistry(chainId),
      ])

    const { specVersion, transactionVersion } = runtimeVersion

    const transferMethod = reapBalance ? "transfer" : "transferKeepAlive"

    const unsigned = methods.balances[transferMethod](
      {
        value: amount,
        dest: to,
      },
      {
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
    )

    // create the unsigned extrinsic
    const tx = registry.createType(
      "Extrinsic",
      { method: unsigned.method },
      { version: unsigned.version }
    )

    // create payload and export it in case it has to be signed by hardware device
    const payload = construct.signingPayload(unsigned, { registry })

    // if hardware account, signing has to be done on the device
    let pendingTransferId
    if (isHardwareAccount(unsigned.address)) {
      // store in pending transactions map
      pendingTransferId = pendingTransfers.add({
        chainId,
        unsigned,
      })
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

    return { tx, registry, unsigned, pendingTransferId }
  }
}
