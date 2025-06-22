import { KeyringPair } from "@polkadot/keyring/types"
import { TypeRegistry } from "@polkadot/types"
import { EXTRINSIC_VERSION } from "@polkadot/types/extrinsic/v4/Extrinsic"
import { Extrinsic } from "@polkadot/types/interfaces"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import {
  ChainId,
  DotNetwork,
  NetworkId,
  SubNativeToken,
  TokenId,
} from "@talismn/chaindata-provider"

import { balanceModules } from "../../../rpcs/balance-modules"
import { chainConnector } from "../../../rpcs/chain-connector"
import { chaindataProvider } from "../../../rpcs/chaindata"
import { Address } from "../../../types/base"
import { getCheckMetadataHashPayloadProps } from "../../../util/getCheckMetadataHashPayloadProps"
import { getExtrinsicDispatchInfo } from "../../../util/getExtrinsicDispatchInfo"
import { getRuntimeVersion } from "../../../util/getRuntimeVersion"
import { getTypeRegistry } from "../../../util/getTypeRegistry"
import { validateHexString } from "../../../util/validateHexString"
import { SignerPayloadJSON } from "../../signing/types"
import {
  dismissTransaction,
  WalletTransactionTransferInfo,
  watchSubstrateTransaction,
} from "../../transactions"
import { AssetTransferMethod, ResponseAssetTransferFeeQuery } from "../types"

export default class AssetTransfersRpc {
  /**
   * Transfers an amount of a token from one account to another.
   *
   * @param chainId - The chain to make the transfer on.
   * @param tokenId - The token id to transfer.
   * @param amount - The amount of planck units to transfer.
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
    method: AssetTransferMethod,
  ) {
    const { chain, registry, tx, unsigned, signature } = await this.prepareTransaction(
      chainId,
      tokenId,
      amount,
      from,
      to,
      tip,
      method,
      true,
    )

    assert(signature, "transaction is not signed")

    const token = await chaindataProvider.getTokenById(tokenId)

    const hash = await watchSubstrateTransaction(chain, registry, unsigned, signature, {
      transferInfo: {
        tokenId: token?.id,
        value: amount,
        to,
      },
    })

    try {
      await chainConnector.send(chain.id, "author_submitExtrinsic", [tx.toHex()])
    } catch (err) {
      hash && dismissTransaction(hash)
      throw err
    }

    return tx.hash.toHex()
  }

  static async transferSigned(
    unsigned: SignerPayloadJSON,
    signature: `0x${string}`,
    transferInfo: WalletTransactionTransferInfo,
  ) {
    const genesisHash = validateHexString(unsigned.genesisHash)
    const chain = await chaindataProvider.networkByGenesisHash(genesisHash)
    if (!chain) throw new Error(`Could not find chain for genesisHash ${genesisHash}`)

    const { registry } = await getTypeRegistry(
      unsigned.genesisHash,
      unsigned.specVersion,
      unsigned.signedExtensions,
    )

    // create the unsigned extrinsic
    const tx = registry.createType(
      "Extrinsic",
      { method: unsigned.method },
      { version: unsigned.version },
    )

    // apply signature
    tx.addSignature(unsigned.address, signature, unsigned)

    await watchSubstrateTransaction(chain, registry, unsigned, signature, { transferInfo })

    await chainConnector.send(chain.id, "author_submitExtrinsic", [tx.toHex()])

    return tx.hash.toHex()
  }

  /**
   * Calculates an estimated fee for transferring an amount of nativeToken from one account to another.
   *
   * @param chainId - The chain to make the transfer on.
   * @param tokenId - The token id to transfer.
   * @param amount - The amount of planck units to transfer.
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
    tip: string,
    method: AssetTransferMethod,
  ): Promise<ResponseAssetTransferFeeQuery> {
    const { tx, unsigned } = await this.prepareTransaction(
      chainId,
      tokenId,
      amount,
      from,
      to,
      tip,
      method,
      false,
    )

    const { partialFee } = await getExtrinsicDispatchInfo(chainId, tx)

    return { partialFee, unsigned }
  }

  /**
   * Builds a signed asset transfer transaction, ready for submission to the chain.
   *
   * @param chainId - The chain to make the transfer on.
   * @param tokenId - The token id to transfer.
   * @param amount - The amount of planck units to transfer.
   * @param from - An unlocked keypair of the sending account.
   * @param to - An address of the receiving account.
   * @returns An object containing:
   *          - `tx` the signed transaction.
   *          - `unsigned` the same transaction but without a signature.
   *          - `registry` a type registry containing metadata for the chain this transaction should be submitted to.
   */
  private static async prepareTransaction(
    chainId: NetworkId,
    tokenId: TokenId,
    amount: string,
    from: KeyringPair,
    to: Address,
    tip: string,
    method: AssetTransferMethod,
    sign: boolean,
  ): Promise<{
    tx: Extrinsic
    registry: TypeRegistry
    unsigned: SignerPayloadJSON
    chain: DotNetwork
    signature?: HexString
  }> {
    const chain = await chaindataProvider.networkById(chainId, "polkadot")
    assert(chain?.genesisHash, `Chain ${chainId} not found in store`)
    const { genesisHash } = chain

    const token = await chaindataProvider.getTokenById(tokenId)
    assert(token, `Token ${tokenId} not found in store`)

    const nativeToken = (await chaindataProvider.getTokenById(
      chain.nativeTokenId,
    )) as SubNativeToken

    // on unstable networks with lots of forks (ex: westend asset hub as of june 2025),
    // using a finalized block as reference for mortality is necessary for txs to get through
    const blockHash = await chainConnector.send<`0x${string}`>(
      chainId,
      "chain_getFinalizedHead",
      [],
      false,
    )

    const [header, runtimeVersion, nonce] = await Promise.all([
      chainConnector.send<{ number: `0x${string}` }>(chainId, "chain_getHeader", [blockHash]),
      getRuntimeVersion(chainId, blockHash),
      chainConnector.send<number>(chainId, "system_accountNextIndex", [from.address]),
    ])

    const blockNumber = Number(header.number)
    const { specVersion, transactionVersion } = runtimeVersion

    const { registry, metadataRpc } = await getTypeRegistry(chainId, specVersion)
    assert(metadataRpc, "Could not fetch metadata")

    const palletModule = balanceModules.find((m) => m.type === token.type)
    assert(palletModule, `Failed to construct tx for token of type '${token.type}'`)

    if (
      !(
        "substrate-assets" === palletModule.type ||
        "substrate-foreignassets" === palletModule.type ||
        "substrate-native" === palletModule.type ||
        "substrate-psp22" === palletModule.type ||
        "substrate-tokens" === palletModule.type
      )
    )
      throw new Error(
        `${token.symbol} transfers on ${token.networkId} are not implemented in this version of Talisman.`,
      )

    const checkMetadataHash = getCheckMetadataHashPayloadProps(
      chain,
      metadataRpc,
      runtimeVersion.specName,
      runtimeVersion.specVersion,
      nativeToken,
    )

    const transaction = await palletModule.transferToken({
      tokenId,
      from: from.address,
      to,
      amount,
      // has to be cast to any because typing of the balance modules doesn't allow different types per module
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transferMethod: method as any,
      metadataRpc,

      userExtensions: chain.signedExtensions,
      registry,
      blockHash,
      blockNumber,
      nonce,
      specVersion,
      transactionVersion,
      tip,
    })

    assert(transaction, `Failed to construct tx for token '${token.id}'`)
    assert(
      transaction.type === "substrate",
      `Failed to handle tx type ${transaction.type} for token '${token.id}'`,
    )

    const era = registry.createType("ExtrinsicEra", { current: blockNumber, period: 64 })

    const unsigned: SignerPayloadJSON = {
      address: from.address,
      assetId: undefined,
      blockHash,
      blockNumber: registry.createType("BlockNumber", blockNumber).toHex(),
      era: era.toHex(),
      genesisHash,
      method: transaction.callData,
      nonce: registry.createType("Compact<Index>", nonce).toHex(),
      signedExtensions: registry.signedExtensions,
      specVersion: registry.createType("u32", specVersion).toHex(),
      tip: registry.createType("Compact<Balance>", tip ? Number(tip) : 0).toHex(),
      transactionVersion: registry.createType("u32", transactionVersion).toHex(),
      version: EXTRINSIC_VERSION,
      withSignedTransaction: true,
      ...checkMetadataHash,
    }

    // create the unsigned extrinsic
    const tx = registry.createType(
      "Extrinsic",
      { method: unsigned.method },
      { version: unsigned.version },
    )

    // create signable extrinsic payload
    const payload = registry.createType("ExtrinsicPayload", unsigned)

    if (sign) {
      // sign it using keyring (will fail if keyring is locked or if address is from hardware device)
      const { signature } = payload.sign(from)

      // apply signature
      tx.addSignature(unsigned.address, signature, payload.toHex())

      return { tx, registry, unsigned, chain, signature }
    } else {
      // tx signed with fake signature for fee calculation
      tx.signFake(unsigned.address, { ...unsigned, era, runtimeVersion })

      return { tx, registry, unsigned, chain, signature: undefined }
    }
  }
}
