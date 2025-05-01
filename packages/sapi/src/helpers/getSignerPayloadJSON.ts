import { mergeUint8, toHex } from "@polkadot-api/utils"
import { SignerPayloadJSON } from "@polkadot/types/types"
import { Binary } from "polkadot-api"

import log from "../log"
import { PayloadSignerConfig } from "../types"
import { getPayloadWithMetadataHash } from "./getPayloadWithMetadataHash"
import { getSendRequestResult } from "./getSendRequestResult"
import { getStorageValue } from "./getStorageValue"
import { mortal, toPjsHex } from "./papi"
import { Chain, ChainInfo } from "./types"

export const getSignerPayloadJSON = async (
  chain: Chain,
  palletName: string,
  methodName: string,
  args: unknown,
  signerConfig: PayloadSignerConfig,
  chainInfo: ChainInfo,
): Promise<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array }> => {
  const { codec, location } = chain.builder.buildCall(palletName, methodName)
  const method = Binary.fromBytes(mergeUint8(new Uint8Array(location), codec.enc(args)))

  const blockNumber = await getStorageValue<number>(chain, "System", "Number", [])
  if (blockNumber === null) throw new Error("Block number not found")

  const [account, genesisHash, blockHash] = await Promise.all([
    // TODO if V15 available, use a runtime call instead : AccountNonceApi/account_nonce
    // about nonce https://github.com/paritytech/json-rpc-interface-spec/issues/156
    getStorageValue<{ nonce: number }>(chain, "System", "Account", [signerConfig.address]),
    getStorageValue<Binary>(chain, "System", "BlockHash", [0]),
    getSendRequestResult<`0x${string}`>(chain, "chain_getBlockHash", [blockNumber], false), // TODO find the right way to fetch this with new RPC api, this is not available in storage yet
  ])
  if (!genesisHash) throw new Error("Genesis hash not found")
  if (!blockHash) throw new Error("Block hash not found")

  const nonce = account ? account.nonce : 0
  const era = mortal({ period: 16, phase: blockNumber % 16 })
  const signedExtensions = chain.metadata.extrinsic.signedExtensions.map((ext) =>
    ext.identifier.toString(),
  )

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

  // Avail support
  if (payload.signedExtensions.includes("CheckAppId"))
    (payload as SignerPayloadJSON & { appId: number }).appId = 0

  log.log("[sapi] payload", { newPayload: payload, txMetadata })

  return { payload, txMetadata }
}
