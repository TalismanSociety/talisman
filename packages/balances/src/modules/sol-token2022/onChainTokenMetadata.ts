import { address as solAddress } from "@solana/kit"
import { getMintDecoder } from "@solana-program/token-2022"
import type { IChainConnectorSol } from "@talismn/chain-connectors"
import { parseSolToken2022TokenId, SolToken2022TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import log from "../../log"
import {
  ERROR_INVALID_DATA,
  ERROR_NO_METADATA,
  ERROR_NO_MINT,
  fetchMetaplexMetadata,
  isTokenDataError,
} from "../sol-shared"
import { getTokenMetadata } from "./mintExtensions"

export const TokenCacheSchema = z.discriminatedUnion("isValid", [
  z.strictObject({
    id: SolToken2022TokenSchema.shape.id,
    isValid: z.literal(true),
    ...SolToken2022TokenSchema.pick({ symbol: true, decimals: true, name: true, logo: true }).shape,
  }),
  z.strictObject({
    id: SolToken2022TokenSchema.shape.id,
    isValid: z.literal(false),
  }),
])

export type CachedToken = z.infer<typeof TokenCacheSchema>

export const fetchOnChainTokenData = async (
  connector: IChainConnectorSol,
  tokenId: string
): Promise<CachedToken | null> => {
  try {
    const { networkId, mintAddress } = parseSolToken2022TokenId(tokenId)

    const rpc = await connector.getRpc(networkId)
    if (!rpc) {
      log.warn(`No connection found for network ${networkId}`)
      return null
    }

    const { value: mintInfo } = await rpc
      .getAccountInfo(solAddress(mintAddress), { encoding: "base64" })
      .send()
    if (!mintInfo?.data) throw new Error(ERROR_NO_MINT)
    const mintData = Buffer.from(mintInfo.data[0], "base64")

    // decodes the base mint layout plus all TLV extensions (including TokenMetadata)
    const mint = getMintDecoder().decode(mintData)

    // Try on-chain Token 2022 metadata extension first (stored in the mint account itself)
    const token2022Metadata = getTokenMetadata(mint)
    if (token2022Metadata) {
      const parsed = TokenCacheSchema.safeParse({
        id: tokenId,
        symbol: token2022Metadata.symbol.trim(),
        name: token2022Metadata.name.trim(),
        decimals: mint.decimals,
        isValid: true,
      })

      if (parsed.success) return parsed.data
    }

    // Fall back to Metaplex metadata PDA (many T22 tokens still use Metaplex)
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

    log.warn("Failed to fetch sol-token2022 token data for %s", tokenId, { err })
  }

  return null
}
