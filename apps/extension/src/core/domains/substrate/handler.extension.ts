import { log } from "@common/log"
import { Twox128 } from "@polkadot-api/substrate-bindings"
import { encryptKemAead } from "@talismn/crypto"
import { mortal, toPjsHex } from "@talismn/sapi"
import { Binary, mergeUint8, parseMetadataRpc } from "@talismn/scale"
import { u8aToHex } from "@talismn/util"
import { ExtensionHandler } from "../../libs/Handler"
import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { getMetadataDef } from "../../util/getMetadataDef"
import { withSecretKey } from "../keyring/withSecretKey"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import { assembleSubstrateTransaction, signSubstratePayload } from "../signing/signSubstratePayload"
import { dismissTransaction, watchSubstrateTransaction } from "../transactions"

export class SubHandler extends ExtensionHandler {
  private submit: MessageHandler<"pri(substrate.rpc.submit)"> = async ({
    payload,
    signature,
    txInfo,
  }) => {
    const chain = await chaindataProvider.getNetworkByGenesisHash(payload.genesisHash)
    if (!chain) throw new Error(`Chain not found for genesis hash ${payload.genesisHash}`)

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
      await chainConnector.send(chain.id, "author_submitExtrinsic", [signedTransaction])
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

      const metadataDef = await getMetadataDef(
        payload.genesisHash,
        parseInt(payload.specVersion, 16)
      )
      const metadataRpc = getMetadataRpcFromDef(metadataDef)
      if (!metadataRpc) throw new Error("Metadata RPC not found")

      // fetch MevShield next key from chain storage
      const { builder } = parseMetadataRpc(metadataRpc)
      const storageCodec = builder.buildStorage("MevShield", "NextKey")
      const stateKey = storageCodec.keys.enc()
      const hexValue = await chainConnector.send<string | null>(
        chain.id,
        "state_getStorage",
        [stateKey],
        false
      )

      // graceful fallback: if shield is disabled on-chain, submit unshielded
      if (!hexValue) {
        log.warn("[mev-shield] NextKey not found on-chain, falling back to standard submission")
        return this.submit({ payload, txInfo })
      }

      const nextKey = storageCodec.value.dec(hexValue) as `0x${string}` | Uint8Array
      const nextKeyBytes = typeof nextKey === "string" ? Binary.fromHex(nextKey) : nextKey

      // compute xxhash128 of the public key for the ciphertext prefix
      const keyHash = Twox128(nextKeyBytes)

      // inner payload uses nonce+1 (block proposer pushes outer tx first, then inner)
      // era/blockNumber/blockHash stay unchanged — the mortal era ≤8 restriction
      // only applies to the outer submit_encrypted call, not the inner extrinsic
      const innerPayload: SignerPayloadJSON = {
        ...payload,
        nonce: toPjsHex(BigInt(payload.nonce) + 1n),
      }

      const innerTxSignature = await withSecretKey(payload.address, (secretKey, curve) =>
        signSubstratePayload(innerPayload, secretKey, curve).then((signed) => signed.signature)
      )

      const signatureInner = innerTxSignature.unwrap()

      const innerTx = await assembleSubstrateTransaction(innerPayload, signatureInner)

      const signedInnerHash = innerTx.hash

      // encrypt the inner tx with next mev shield key (v2 wire format includes keyHash prefix)
      const ciphertextBytes = await encryptKemAead(
        keyHash,
        nextKeyBytes,
        innerTx.signedTransactionBytes
      )

      // craft the encrypted call (v2: commitment parameter removed)
      const { codec, location } = builder.buildCall("MevShield", "submit_encrypted")
      const args = {
        ciphertext: ciphertextBytes,
      }
      const method = mergeUint8([new Uint8Array(location), codec.enc(args)])

      // Fetch fresh block reference for the outer tx to avoid stale birth block.
      // The UI payload's blockNumber can be minutes old; with a mortal era of only 8 blocks,
      // a stale reference causes "AncientBirthBlock" when birth(current) == current.
      const freshBlockHash = await chainConnector.send<`0x${string}`>(
        chain.id,
        "chain_getFinalizedHead",
        [],
        false
      )
      const freshHeader = await chainConnector.send<{ number: `0x${string}` }>(
        chain.id,
        "chain_getHeader",
        [freshBlockHash],
        false
      )
      if (!freshHeader?.number) throw new Error("Unable to fetch fresh block header")
      const freshBlockNumber = Number.parseInt(freshHeader.number, 16)
      if (!Number.isFinite(freshBlockNumber)) throw new Error("Invalid fresh block number")

      // outer payload uses short mortal era (≤8 blocks) as required by CheckMortality
      const outerEra = u8aToHex(
        mortal({
          period: MEV_SHIELD_ERA_PERIOD,
          phase: freshBlockNumber % MEV_SHIELD_ERA_PERIOD,
        })
      )
      const outerPayload: SignerPayloadJSON = {
        ...payload,
        method: Binary.toHex(method),
        era: outerEra,
        blockNumber: toPjsHex(freshBlockNumber, 4),
        blockHash: freshBlockHash,
        mode: 0,
        metadataHash: undefined,
      }

      // sign the outer tx payload
      const outerTxSignature = await withSecretKey(payload.address, (secretKey, curve) =>
        signSubstratePayload(outerPayload, secretKey, curve).then((signed) => signed.signature)
      )

      const signatureOuter = outerTxSignature.unwrap()

      const outerTx = await assembleSubstrateTransaction(outerPayload, signatureOuter)

      const signedOuterHash = outerTx.hash

      // watch execution of both transactions (both should appear in tx history)
      await watchSubstrateTransaction(chain, outerPayload, signatureOuter)
      await watchSubstrateTransaction(chain, innerPayload, signatureInner, { txInfo })

      try {
        // submit only outer tx
        await chainConnector.send(chain.id, "author_submitExtrinsic", [outerTx.signedTransaction])
      } catch (err) {
        if (signedInnerHash) dismissTransaction(signedInnerHash)
        if (signedOuterHash) dismissTransaction(signedOuterHash)
        throw err
      }

      return { hash: signedOuterHash, innerHash: signedInnerHash }
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

      // --------------------------------------------------------------------
      // substrate chain metadata -----------------------------
      // --------------------------------------------------------------------
      case "pri(substrate.metadata.get)":
        return this.metadata(request as RequestTypes["pri(substrate.metadata.get)"])
    }
    throw new Error(`Unable to handle message of type ${type} (substrate)`)
  }
}

/** Maximum era period for MEV Shield transactions (≤8 blocks enforced by CheckMortality on subtensor) */
const MEV_SHIELD_ERA_PERIOD = 8
