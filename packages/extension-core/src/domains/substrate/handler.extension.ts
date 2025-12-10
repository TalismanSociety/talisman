import { sign as signExtrinsic } from "@polkadot/types/extrinsic/util"
import { u8aToHex } from "@polkadot/util"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"
import { blake2b256, encryptKemAead } from "@talismn/crypto"
import { Binary, FixedSizeBinary, mergeUint8, parseMetadataRpc } from "@talismn/scale"

import { ExtensionHandler } from "../../libs/Handler"
import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getMetadataDef } from "../../util/getMetadataDef"
import { getTypeRegistry } from "../../util/getTypeRegistry"
import { withPjsKeyringPair } from "../keyring/withPjsKeyringPair"
import { dismissTransaction, watchSubstrateTransaction } from "../transactions"

export class SubHandler extends ExtensionHandler {
  private submit: MessageHandler<"pri(substrate.rpc.submit)"> = async ({
    payload,
    signature,
    txInfo,
  }) => {
    const chain = await chaindataProvider.getNetworkByGenesisHash(payload.genesisHash)
    if (!chain) throw new Error(`Chain not found for genesis hash ${payload.genesisHash}`)

    const { registry } = await getTypeRegistry(
      payload.genesisHash,
      payload.specVersion,
      payload.signedExtensions,
    )

    if (!signature) {
      const result = await withPjsKeyringPair(payload.address, async (pair) => {
        const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
          version: payload.version,
        })

        // LAOS signing bug workaround
        return typeof chain?.hasExtrinsicSignatureTypePrefix !== "boolean"
          ? // use default value of `withType`
            // (auto-detected by whether `ExtrinsicSignature` is an `Enum` or not in the chain metadata)
            extrinsicPayload.sign(pair).signature
          : // use override value of `withType` from chaindata
            u8aToHex(
              signExtrinsic(registry, pair, extrinsicPayload.toU8a({ method: true }), {
                // use chaindata override value of `withType`
                withType: chain.hasExtrinsicSignatureTypePrefix,
              }),
            )
      })

      signature = result.unwrap()
    }

    await watchSubstrateTransaction(chain, registry, payload, signature, { txInfo })

    const tx = registry.createType(
      "Extrinsic",
      { method: payload.method },
      { version: payload.version },
    )

    // apply signature to the modified payload
    tx.addSignature(payload.address, signature, payload)

    const hash = tx.hash.toHex()

    try {
      await chainConnector.send(chain.id, "author_submitExtrinsic", [tx.toHex()])
    } catch (err) {
      if (hash) dismissTransaction(hash)
      throw err
    }

    return { hash }
  }

  private submitWithBittensorMevShield: MessageHandler<"pri(substrate.rpc.submit.withBittensorMevShield)"> =
    async ({ payload, txInfo }) => {
      const chain = await chaindataProvider.getNetworkByGenesisHash(payload.genesisHash)
      if (!chain) throw new Error(`Chain not found for genesis hash ${payload.genesisHash}`)

      const { registry, metadataRpc } = await getTypeRegistry(
        payload.genesisHash,
        payload.specVersion,
        payload.signedExtensions,
      )
      if (!metadataRpc) throw new Error("Metadata RPC not found")

      // increment nonce of the inner payload as it will be executed after the wrapper transaction
      const innerPayload: SignerPayloadJSON = {
        ...payload,
        nonce: toPjsHex(BigInt(payload.nonce) + 1n),
      }

      const innerTxSignature = await withPjsKeyringPair(payload.address, async (pair) => {
        const extrinsicPayload = registry.createType("ExtrinsicPayload", innerPayload)
        return extrinsicPayload.sign(pair).signature
      })

      const signatureInner = innerTxSignature.unwrap()

      const innerTx = registry.createType(
        "Extrinsic",
        { method: innerPayload.method },
        { version: innerPayload.version },
      )

      // apply signature to the modified payload
      innerTx.addSignature(payload.address, signatureInner, innerPayload)

      const signedInnerHash = innerTx.hash.toHex()

      // fetch MevShield next key from chain storage
      const { builder } = parseMetadataRpc(metadataRpc)
      const storageCodec = builder.buildStorage("MevShield", "NextKey")
      const stateKey = storageCodec.keys.enc()
      const hexValue = await chainConnector.send<string | null>(
        chain.id,
        "state_getStorage",
        [stateKey],
        false,
      )
      if (!hexValue) throw new Error("MevShield NextKey not found")
      const nextKeyBinary = storageCodec.value.dec(hexValue) as Binary

      // encrypt the inner tx with next mev shield key
      const ciphertextBytes = await encryptKemAead(nextKeyBinary.asBytes(), innerTx.toU8a())

      // the hash of the inner tx must also be supplied in the outer encrypted call
      const commitment = blake2b256(innerTx.toU8a())

      // craft the encrypted call
      const { codec, location } = builder.buildCall("MevShield", "submit_encrypted")
      const args = {
        commitment: new FixedSizeBinary(commitment),
        ciphertext: new Binary(ciphertextBytes),
      }
      const method = Binary.fromBytes(mergeUint8([new Uint8Array(location), codec.enc(args)]))

      const outerPayload: SignerPayloadJSON = {
        ...payload,
        method: method.asHex(),
        mode: 0,
        metadataHash: undefined,
      }

      // sign the outer tx payload
      const outerTxSignature = await withPjsKeyringPair(payload.address, async (pair) => {
        const extrinsicPayload = registry.createType("ExtrinsicPayload", outerPayload)
        return extrinsicPayload.sign(pair).signature
      })

      const signatureOuter = outerTxSignature.unwrap()

      const outerTx = registry.createType(
        "Extrinsic",
        { method: outerPayload.method },
        { version: outerPayload.version },
      )

      // apply signature to the modified payload
      outerTx.addSignature(payload.address, signatureOuter, outerPayload)

      const signedOuterHash = outerTx.hash.toHex()

      // watch execution of both transactions (both should appear in tx history)
      await watchSubstrateTransaction(chain, registry, outerPayload, signatureOuter, { txInfo })
      await watchSubstrateTransaction(chain, registry, innerPayload, signatureInner, { txInfo })

      try {
        // submit only outer tx
        await chainConnector.send(chain.id, "author_submitExtrinsic", [outerTx.toHex()])
      } catch (err) {
        if (signedInnerHash) dismissTransaction(signedInnerHash)
        if (signedOuterHash) dismissTransaction(signedOuterHash)
        throw err
      }

      return { hash: signedOuterHash }
    }

  private send: MessageHandler<"pri(substrate.rpc.send)"> = ({
    chainId,
    method,
    params,
    isCacheable,
  }) => {
    return chainConnector.send(chainId, method, params, isCacheable)
  }

  private metadata: MessageHandler<"pri(substrate.metadata.get)"> = ({
    genesisHash,
    specVersion,
  }) => {
    return getMetadataDef(genesisHash, specVersion)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // substrate RPC handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(substrate.rpc.send)":
        return this.send(request as RequestTypes["pri(substrate.rpc.send)"])

      case "pri(substrate.rpc.submit)":
        return this.submit(request as RequestTypes["pri(substrate.rpc.submit)"])

      case "pri(substrate.rpc.submit.withBittensorMevShield)":
        return this.submitWithBittensorMevShield(
          request as RequestTypes["pri(substrate.rpc.submit.withBittensorMevShield)"],
        )

      // --------------------------------------------------------------------
      // substrate chain metadata -----------------------------
      // --------------------------------------------------------------------
      case "pri(substrate.metadata.get)":
        return this.metadata(request as RequestTypes["pri(substrate.metadata.get)"])
    }
    throw new Error(`Unable to handle message of type ${type} (substrate)`)
  }
}

const toPjsHex = (value: number | bigint, minByteLen?: number) => {
  let inner = value.toString(16)
  inner = (inner.length % 2 ? "0" : "") + inner
  const nPaddedBytes = Math.max(0, (minByteLen || 0) - inner.length / 2)
  return ("0x" + "00".repeat(nPaddedBytes) + inner) as `0x${string}`
}
