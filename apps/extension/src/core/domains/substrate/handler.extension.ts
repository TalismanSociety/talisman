import { log } from "@common/log"
import { sign as signExtrinsic } from "@polkadot/types/extrinsic/util"
import { Twox128 } from "@polkadot-api/substrate-bindings"
import type { SignerPayloadJSON } from "@substrate/txwrapper-core"
import { encryptKemAead } from "@talismn/crypto"
import { Binary, mergeUint8, parseMetadataRpc } from "@talismn/scale"
import { u8aToHex } from "@talismn/util"

import { ExtensionHandler } from "../../libs/Handler"
import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
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
      payload.signedExtensions
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
              })
            )
      })

      signature = result.unwrap()
    }

    await watchSubstrateTransaction(chain, registry, payload, signature, { txInfo })

    const tx = registry.createType(
      "Extrinsic",
      { method: payload.method },
      { version: payload.version }
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
        payload.signedExtensions
      )
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

      const innerTxSignature = await withPjsKeyringPair(payload.address, async (pair) => {
        const extrinsicPayload = registry.createType("ExtrinsicPayload", innerPayload)
        return extrinsicPayload.sign(pair).signature
      })

      const signatureInner = innerTxSignature.unwrap()

      const innerTx = registry.createType(
        "Extrinsic",
        { method: innerPayload.method },
        { version: innerPayload.version }
      )

      // apply signature to the modified payload
      innerTx.addSignature(payload.address, signatureInner, innerPayload)

      const signedInnerHash = innerTx.hash.toHex()

      // encrypt the inner tx with next mev shield key (v2 wire format includes keyHash prefix)
      const ciphertextBytes = await encryptKemAead(keyHash, nextKeyBytes, innerTx.toU8a())

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
      const outerEra = mortalEra({
        period: MEV_SHIELD_ERA_PERIOD,
        phase: freshBlockNumber % MEV_SHIELD_ERA_PERIOD,
      })
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
      const outerTxSignature = await withPjsKeyringPair(payload.address, async (pair) => {
        const extrinsicPayload = registry.createType("ExtrinsicPayload", outerPayload)
        return extrinsicPayload.sign(pair).signature
      })

      const signatureOuter = outerTxSignature.unwrap()

      const outerTx = registry.createType(
        "Extrinsic",
        { method: outerPayload.method },
        { version: outerPayload.version }
      )

      // apply signature to the modified payload
      outerTx.addSignature(payload.address, signatureOuter, outerPayload)

      const signedOuterHash = outerTx.hash.toHex()

      // watch execution of both transactions (both should appear in tx history)
      await watchSubstrateTransaction(chain, registry, outerPayload, signatureOuter)
      await watchSubstrateTransaction(chain, registry, innerPayload, signatureInner, { txInfo })

      try {
        // submit only outer tx
        await chainConnector.send(chain.id, "author_submitExtrinsic", [outerTx.toHex()])
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

const toPjsHex = (value: number | bigint, minByteLen?: number) => {
  let inner = value.toString(16)
  inner = (inner.length % 2 ? "0" : "") + inner
  const nPaddedBytes = Math.max(0, (minByteLen || 0) - inner.length / 2)
  return `0x${"00".repeat(nPaddedBytes)}${inner}` as `0x${string}`
}

/** Maximum era period for MEV Shield transactions (≤8 blocks enforced by CheckMortality on subtensor) */
const MEV_SHIELD_ERA_PERIOD = 8

/** Encode a mortal era as a hex string for SignerPayloadJSON */
const mortalEra = (value: { period: number; phase: number }): `0x${string}` => {
  const factor = Math.max(value.period >> 12, 1)
  const left = Math.min(Math.max(trailingZeroes(value.period) - 1, 1), 15)
  const right = (value.phase / factor) << 4
  const encoded = left | right
  // era is encoded as a u16 LE
  const byte0 = encoded & 0xff
  const byte1 = (encoded >> 8) & 0xff
  return `0x${byte0.toString(16).padStart(2, "0")}${byte1.toString(16).padStart(2, "0")}`
}

function trailingZeroes(n: number) {
  let i = 0
  while (!(n & 1)) {
    i++
    n >>= 1
  }
  return i
}
