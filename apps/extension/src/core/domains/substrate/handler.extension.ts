import { log } from "@common/log"
import { ExtensionHandler } from "../../libs/Handler"
import { chainConnectorDot } from "../../rpcs/chain-connector-dot"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { withSecretKey } from "../keyring/withSecretKey"
import { getMetadataDef } from "../metadata/getMetadataDef"
import { assembleSubstrateTransaction, signSubstratePayload } from "../signing/signSubstratePayload"
import { dismissTransaction } from "../transactions/store.transactions"
import { watchSubstrateTransaction } from "../transactions/watchSubstrateTransaction"
import {
  getEraBlocksLeftAt,
  getMevShieldDeadline,
  getMevShieldInnerPayload,
  MIN_ERA_BLOCKS_TO_SUBMIT,
} from "./helpers"
import {
  broadcastMevShield,
  broadcastMevShieldInWindow,
  createMevShieldSeal,
  getBestHead,
  waitForNextHead,
} from "./mevShield"

export class SubHandler extends ExtensionHandler {
  private submit: MessageHandler<"pri(substrate.rpc.submit)"> = async ({
    payload,
    signature,
    txInfo,
  }) => {
    const chain = await getChain(payload)

    if (!signature) {
      const result = await withSecretKey(payload.address, (secretKey, curve) =>
        signSubstratePayload(payload, secretKey, curve, {
          // LAOS signing bug workaround: chaindata override of the signature type prefix,
          // auto-detected from the chain metadata when not set
          hasExtrinsicSignatureTypePrefix:
            typeof chain?.hasExtrinsicSignatureTypePrefix === "boolean"
              ? chain.hasExtrinsicSignatureTypePrefix
              : undefined,
        }).then((signed) => signed.signature)
      )

      signature = result.unwrap()
    }

    await watchSubstrateTransaction(chain, payload, signature, { txInfo })

    const { signedTransaction, hash } = await assembleSubstrateTransaction(payload, signature)

    try {
      await chainConnectorDot.send(chain.id, "author_submitExtrinsic", [signedTransaction])
    } catch (err) {
      if (hash) dismissTransaction(hash)
      throw err
    }

    return { hash }
  }

  private submitWithBittensorMevShield: MessageHandler<"pri(substrate.rpc.submit.withBittensorMevShield)"> =
    async ({ payload, txInfo }) => {
      const chain = await getChain(payload)

      const innerPayload = getMevShieldInnerPayload(payload)
      const innerSignature = await signWithKeystore(innerPayload)
      const [{ sealAt }, head] = await Promise.all([
        createMevShieldSeal(chain.id, payload, innerSignature),
        getBestHead(chain.id),
      ])

      const outerPayload = await sealAt(head)
      if (!outerPayload) {
        log.warn("[mev-shield] NextKey not found on-chain, falling back to standard submission")
        return this.submit({ payload, txInfo })
      }

      return broadcastMevShield(chain, {
        inner: { payload: innerPayload, signature: innerSignature },
        outer: { payload: outerPayload, signature: await signWithKeystore(outerPayload) },
        txInfo,
      })
    }

  private prepareMevShield: MessageHandler<"pri(substrate.mevShield.prepare)"> = async ({
    payload,
    innerSignature,
  }) => {
    const chain = await getChain(payload)
    const { sealAt, blockTimeMs } = await createMevShieldSeal(chain.id, payload, innerSignature)

    const head = await waitForNextHead(chain.id)
    if (getEraBlocksLeftAt(payload, head.number) < MIN_ERA_BLOCKS_TO_SUBMIT)
      return { status: "expired" }

    const outerPayload = await sealAt(head)
    if (!outerPayload) return { status: "unavailable" }

    return {
      status: "ready",
      outerPayload,
      shieldWindow: {
        headNumber: head.number,
        deadline: getMevShieldDeadline(head.seenAt, blockTimeMs),
      },
    }
  }

  private submitMevShield: MessageHandler<"pri(substrate.mevShield.submit)"> = async ({
    payload,
    innerSignature,
    outerPayload,
    outerSignature,
    shieldWindow,
    txInfo,
  }) => {
    const chain = await getChain(payload)
    const signed = {
      inner: { payload: getMevShieldInnerPayload(payload), signature: innerSignature },
      outer: { payload: outerPayload, signature: outerSignature },
      txInfo,
    }
    return broadcastMevShieldInWindow(chain, signed, shieldWindow)
  }

  private send: MessageHandler<"pri(substrate.rpc.send)"> = ({
    chainId,
    method,
    params,
    isCacheable,
  }) => {
    return chainConnectorDot.send(chainId, method, params, isCacheable)
  }

  private metadata: MessageHandler<"pri(substrate.metadata.get)"> = ({
    genesisHash,
    specVersion,
  }) => {
    return getMetadataDef(genesisHash, specVersion)
  }

  public async handle<TMessageType extends MessageTypes>(
    _id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    _port: Port
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
          request as RequestTypes["pri(substrate.rpc.submit.withBittensorMevShield)"]
        )

      case "pri(substrate.mevShield.prepare)":
        return this.prepareMevShield(request as RequestTypes["pri(substrate.mevShield.prepare)"])

      case "pri(substrate.mevShield.submit)":
        return this.submitMevShield(request as RequestTypes["pri(substrate.mevShield.submit)"])

      // --------------------------------------------------------------------
      // substrate chain metadata -----------------------------
      // --------------------------------------------------------------------
      case "pri(substrate.metadata.get)":
        return this.metadata(request as RequestTypes["pri(substrate.metadata.get)"])
    }
    throw new Error(`Unable to handle message of type ${type} (substrate)`)
  }
}

const getChain = async (payload: SignerPayloadJSON) => {
  const chain = await chaindataProvider.getNetworkByGenesisHash(payload.genesisHash)
  if (!chain) throw new Error(`Chain not found for genesis hash ${payload.genesisHash}`)
  return chain
}

const signWithKeystore = async (payload: SignerPayloadJSON) => {
  const result = await withSecretKey(payload.address, (secretKey, curve) =>
    signSubstratePayload(payload, secretKey, curve).then((signed) => signed.signature)
  )
  return result.unwrap()
}
