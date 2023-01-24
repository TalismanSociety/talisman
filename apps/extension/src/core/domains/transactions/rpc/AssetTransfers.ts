import { ChainId } from "@core/domains/chains/types"
import { SignerPayloadJSON } from "@core/domains/signing/types"
import { ResponseAssetTransferFeeQuery } from "@core/domains/transactions/types"
import { isHardwareAccount, isQrAccount } from "@core/handlers/helpers"
import RpcFactory from "@core/libs/RpcFactory"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { SubscriptionCallback } from "@core/types"
import { Address } from "@core/types/base"
import { getExtrinsicDispatchInfo } from "@core/util/getExtrinsicDispatchInfo"
import { getRuntimeVersion } from "@core/util/getRuntimeVersion"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { KeyringPair } from "@polkadot/keyring/types"
import { TypeRegistry } from "@polkadot/types"
import { Extrinsic, ExtrinsicStatus } from "@polkadot/types/interfaces"
import { assert } from "@polkadot/util"
import { construct, defineMethod } from "@substrate/txwrapper-core"

import { pendingTransfers } from "./PendingTransfers"

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
   * Calculates an estimated fee for transferring an amount of nativeToken from one account to another.
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

    const { partialFee } = await getExtrinsicDispatchInfo(chainId, tx)

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
    const chain = await chaindataProvider.getChain(chainId)
    assert(chain?.genesisHash, `Chain ${chainId} not found in store`)
    const { genesisHash } = chain

    const [blockHash, { block }, nonce, runtimeVersion] = await Promise.all([
      RpcFactory.send(chainId, "chain_getBlockHash", [], false),
      RpcFactory.send(chainId, "chain_getBlock", [], false),
      RpcFactory.send(chainId, "system_accountNextIndex", [from.address]),
      getRuntimeVersion(chainId),
    ])

    const { specVersion, transactionVersion } = runtimeVersion

    const { registry, metadataRpc } = await getTypeRegistry(chainId, specVersion, blockHash)
    assert(metadataRpc, "Could not fetch metadata")

    const unsigned = defineMethod(
      {
        method: {
          pallet: "balances",
          name: reapBalance ? "transfer" : "transferKeepAlive",
          args: {
            value: amount,
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
        specVersion,
        tip: tip ? Number(tip) : 0,
        transactionVersion,
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

    // if hardware or qr account, signing has to be done on the device
    let pendingTransferId
    if (isHardwareAccount(unsigned.address) || isQrAccount(unsigned.address)) {
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
