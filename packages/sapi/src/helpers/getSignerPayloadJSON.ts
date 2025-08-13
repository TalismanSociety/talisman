import { mergeUint8, toHex } from "@polkadot-api/utils"
import { SignerPayloadJSON } from "@polkadot/types/types"
import { u8aToHex } from "@polkadot/util"
import { Binary } from "polkadot-api"

import log from "../log"
import { PayloadSignerConfig } from "../types"
import { getPayloadWithMetadataHash } from "./getPayloadWithMetadataHash"
import { getSendRequestResult } from "./getSendRequestResult"
import { getStorageValue } from "./getStorageValue"
import { mortal, toPjsHex } from "./papi"
import { Chain, ChainInfo } from "./types"

const ERA_PERIOD = 64 // validity period in blocks, used for mortal era

export const getSignerPayloadJSON = async (
  chain: Chain,
  palletName: string,
  methodName: string,
  args: unknown,
  signerConfig: PayloadSignerConfig,
  chainInfo: ChainInfo,
): Promise<{
  payload: SignerPayloadJSON
  txMetadata: Uint8Array | undefined
  shortMetadata: `0x${string}` | undefined
}> => {
  const { codec, location } = chain.builder.buildCall(palletName, methodName)
  const method = Binary.fromBytes(mergeUint8([new Uint8Array(location), codec.enc(args)]))

  // on unstable networks with lots of forks (ex: westend asset hub as of june 2025),
  // using a finalized block as reference for mortality is necessary for txs to get through
  let blockHash = await getSendRequestResult<`0x${string}`>(
    chain,
    "chain_getFinalizedHead",
    [],
    false,
  )

  const [nonce, genesisHash, blockNumberFinalized, blockNumberCurrent] = await Promise.all([
    getSendRequestResult<number>(chain, "system_accountNextIndex", [signerConfig.address], false),
    getStorageValue<Binary>(chain, "System", "BlockHash", [0]),
    getStorageValue<number>(chain, "System", "Number", [], blockHash),
    getStorageValue<number>(chain, "System", "Number", []),
  ])
  if (!genesisHash) throw new Error("Genesis hash not found")
  if (!blockHash) throw new Error("Block hash not found")

  let blockNumber = blockNumberFinalized

  // on Autonomys the finalized block hash is wrong (7000 blocks behind),
  // if we use it to craft a tx it will be invalid
  // => if finalized block number is more than 32 blocks behind, use current - 16
  if (blockNumberCurrent - blockNumberFinalized > 32) {
    blockNumber = blockNumberCurrent - 16

    const binBlockHash = await getStorageValue<Binary>(chain, "System", "BlockHash", [blockNumber])
    blockHash = binBlockHash.asHex() as `0x${string}`
  }

  const era = mortal({ period: ERA_PERIOD, phase: blockNumber % ERA_PERIOD })
  const signedExtensions = chain.metadata.extrinsic.signedExtensions.map((ext) => ext.identifier)

  const basePayload: SignerPayloadJSON = {
    address: signerConfig.address,
    genesisHash: genesisHash.asHex() as `0x${string}`,
    blockHash,
    method: method.asHex(),
    signedExtensions,
    nonce: toPjsHex(nonce, 4),
    specVersion: toPjsHex(chainInfo.specVersion, 4),
    transactionVersion: toPjsHex(chainInfo.transactionVersion, 4),
    blockNumber: toPjsHex(blockNumber, 4),
    era: toHex(era) as `0x${string}`,
    tip: toPjsHex(0, 16), // TODO gas station (required for Astar)
    assetId: undefined,
    version: 4,
  }

  const { payload, txMetadata } = getPayloadWithMetadataHash(chain, chainInfo, basePayload)
  const shortMetadata = txMetadata ? u8aToHex(txMetadata) : undefined

  // Avail support
  if (payload.signedExtensions.includes("CheckAppId"))
    (payload as SignerPayloadJSON & { appId: number }).appId = 0

  log.log("[sapi] payload", { newPayload: payload, txMetadata })

  return {
    payload,
    txMetadata, // TODO remove
    shortMetadata,
  }
}
