import { log } from "@common/log"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { QuoteFee, SwapModuleTransaction } from "@core/domains/swaps/types"
import { MultiAddress } from "@polkadot-api/descriptors"
import { getScaleApi, type ScaleApi } from "@talismn/sapi"
import { api } from "@ui/api"
import { getNetworksMapById$, getToken$ } from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
import { firstValueFrom } from "rxjs"
import { parseUserInputToPlanck } from "../swap-utils"
import type {
  DepositInfo,
  DepositSwapAsset,
  DepositTransactionParams,
} from "./deposit-swap-transactions"

export async function estimateSubstrateDepositFee(
  fromAsset: DepositSwapAsset,
  fromAddress: string
): Promise<QuoteFee | null> {
  try {
    const knownSubstrateNetworks = await firstValueFrom(
      getNetworksMapById$({ platform: "polkadot" })
    )
    const network = knownSubstrateNetworks[fromAsset.chainId]
    if (!network || !("genesisHash" in network)) return null

    const nativeToken = await firstValueFrom(getToken$(network.nativeTokenId))
    if (!nativeToken) return null

    const metadataDef = await api.subChainMetadata(network.genesisHash)
    if (!metadataDef?.metadataRpc) return null

    const metadataRpc = getMetadataRpcFromDef(metadataDef)
    if (!metadataRpc) return null

    const sapi = getScaleApi(
      {
        chainId: network.id,
        send: (...args) => api.subSend(network.id, ...args),
      },
      metadataRpc as `0x${string}`,
      nativeToken,
      network.hasCheckMetadataHash,
      network.signedExtensions,
      network.registryTypes
    )

    // Create a dummy transfer payload for fee estimation (amount/recipient don't affect the fee)
    const isAssetHubToken = fromAsset.assetHubAssetId !== undefined
    const { payload } = await sapi.getExtrinsicPayload(
      isAssetHubToken ? "Assets" : "Balances",
      "transfer_keep_alive",
      isAssetHubToken
        ? {
            id: fromAsset.assetHubAssetId,
            target: MultiAddress.Id(fromAddress),
            amount: 0n,
          }
        : { dest: MultiAddress.Id(fromAddress), value: 0n },
      { address: fromAddress }
    )

    const fee = await sapi.getFeeEstimate(payload)
    const amount = BigNumber(fee.toString()).times(10 ** -nativeToken.decimals)
    return { name: "Est. Gas Fees", gas: true, tokenId: nativeToken.id, amount }
  } catch (err) {
    log.error(new Error("Failed to estimate substrate gas", { cause: err }))
    return null
  }
}

async function buildSubstrateDepositPayload(params: {
  fromAsset: DepositSwapAsset
  fromAddress: string
  deposit: DepositInfo
  sapi: ScaleApi
  allowReap?: boolean
}): Promise<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array } | null> {
  try {
    const { fromAsset, fromAddress, deposit, sapi, allowReap } = params
    if (!sapi) return null

    if (!fromAddress) throw new Error("Missing from address")

    if (fromAsset.platform !== "polkadot") return null

    const depositAmount = parseUserInputToPlanck(deposit.depositAmount, fromAsset.decimals)

    const payload =
      fromAsset.assetHubAssetId !== undefined
        ? await sapi.getExtrinsicPayload(
            "Assets",
            allowReap ? "transfer" : "transfer_keep_alive",
            {
              id: fromAsset.assetHubAssetId,
              target: MultiAddress.Id(deposit.depositAddress),
              amount: depositAmount,
            },
            { address: fromAddress }
          )
        : await sapi.getExtrinsicPayload(
            "Balances",
            allowReap ? "transfer_allow_death" : "transfer_keep_alive",
            { dest: MultiAddress.Id(deposit.depositAddress), value: depositAmount },
            { address: fromAddress }
          )

    return payload
  } catch (cause) {
    log.error(new Error("Failed to create substrate payload", { cause }))
    throw cause
  }
}

export async function buildSubstrateDeposit(
  params: DepositTransactionParams
): Promise<SwapModuleTransaction> {
  const { context } = params
  if (context.platform !== "polkadot") throw new Error("Missing substrate context")
  const payload = await buildSubstrateDepositPayload({
    ...params,
    sapi: context.sapi,
    allowReap: context.allowReap,
  })
  if (!payload) throw new Error("Failed to build deposit transaction")
  return { platform: "polkadot", payload: payload.payload, txMetadata: payload.txMetadata }
}
