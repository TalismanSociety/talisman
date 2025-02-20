import { sign as signExtrinsic } from "@polkadot/types/extrinsic/util"
import { u8aToHex } from "@polkadot/util"

import { getPairForAddressSafely } from "../../handlers/helpers"
import { ExtensionHandler } from "../../libs/Handler"
import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getMetadataDef } from "../../util/getMetadataDef"
import { getTypeRegistry } from "../../util/getTypeRegistry"
import { dismissTransaction, watchSubstrateTransaction } from "../transactions"

export class SubHandler extends ExtensionHandler {
  private submit: MessageHandler<"pri(substrate.rpc.submit)"> = async ({ payload, signature }) => {
    const chain = await chaindataProvider.chainByGenesisHash(payload.genesisHash)
    if (!chain) throw new Error(`Chain not found for genesis hash ${payload.genesisHash}`)

    const { registry } = await getTypeRegistry(
      payload.genesisHash,
      payload.specVersion,
      payload.blockHash,
      payload.signedExtensions,
    )

    if (!signature) {
      const result = await getPairForAddressSafely(payload.address, async (pair) => {
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

    await watchSubstrateTransaction(chain, registry, payload, signature)

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
    blockHash,
  }) => {
    return getMetadataDef(genesisHash, specVersion, blockHash)
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

      // --------------------------------------------------------------------
      // substrate chain metadata -----------------------------
      // --------------------------------------------------------------------
      case "pri(substrate.metadata.get)":
        return this.metadata(request as RequestTypes["pri(substrate.metadata.get)"])
    }
    throw new Error(`Unable to handle message of type ${type} (substrate)`)
  }
}
