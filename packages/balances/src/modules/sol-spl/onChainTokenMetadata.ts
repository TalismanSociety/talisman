import { address as solAddress } from "@solana/kit"
import { getMintDecoder } from "@solana-program/token"
import type { IChainConnectorSol } from "@talismn/chain-connectors"
import { parseSolSplTokenId, SolSplTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import log from "../../log"
import {
  ERROR_INVALID_DATA,
  ERROR_NO_METADATA,
  ERROR_NO_MINT,
  fetchMetaplexMetadata,
  isTokenDataError,
} from "../sol-shared"

export const TokenCacheSchema = z.discriminatedUnion("isValid", [
  z.strictObject({
    id: SolSplTokenSchema.shape.id,
    isValid: z.literal(true),
    ...SolSplTokenSchema.pick({ symbol: true, decimals: true, name: true, logo: true }).shape,
  }),
  z.strictObject({
    id: SolSplTokenSchema.shape.id,
    isValid: z.literal(false),
  }),
])

export type CachedToken = z.infer<typeof TokenCacheSchema>

export const fetchOnChainTokenData = async (
  connector: IChainConnectorSol,
  tokenId: string
): Promise<CachedToken | null> => {
  try {
    const { networkId, mintAddress } = parseSolSplTokenId(tokenId)

    const rpc = await connector.getRpc(networkId)
    if (!rpc) {
      log.warn(`No connection found for network ${networkId}`)
      return null
    }

    const { value: mintInfo } = await rpc
      .getAccountInfo(solAddress(mintAddress), { encoding: "base64" })
      .send()
    if (!mintInfo?.data) throw new Error(ERROR_NO_MINT)
    const mint = getMintDecoder().decode(Buffer.from(mintInfo.data[0], "base64"))

    const metadata = await fetchMetaplexMetadata(rpc, mintAddress)
    if (!metadata) throw new Error(ERROR_NO_METADATA)

    const parsed = TokenCacheSchema.safeParse({
      id: tokenId,
      symbol: metadata.symbol,
      name: metadata.name,
      decimals: mint.decimals,
      isValid: true,
    })

    if (!parsed.success) throw new Error(ERROR_INVALID_DATA)

    return parsed.data
  } catch (err) {
    const msg = (err as Error).message

    if (isTokenDataError(msg))
      return TokenCacheSchema.parse({
        id: tokenId,
        isValid: false,
      })

    log.warn("Failed to fetch sol-spl token data for %s", tokenId, { err })
  }

  return null
}
