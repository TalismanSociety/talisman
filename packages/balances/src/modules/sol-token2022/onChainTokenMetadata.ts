import { deserializeMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey, sol } from "@metaplex-foundation/umi"
import { getAddressEncoder, getProgramDerivedAddress, address as solAddress } from "@solana/kit"
import { getMintDecoder } from "@solana-program/token-2022"
import type { IChainConnectorSol } from "@talismn/chain-connectors"
import { parseSolToken2022TokenId, SolToken2022TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import log from "../../log"
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

const METAPLEX_PROGRAM_ID = solAddress("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

const ERROR_NO_MINT = "No mint info available"
const ERROR_NO_METADATA = "No metadata account found"
const ERROR_INVALID_DATA = "Invalid on-chain data"

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
    const addressEncoder = getAddressEncoder()
    const [metadataPDA] = await getProgramDerivedAddress({
      programAddress: METAPLEX_PROGRAM_ID,
      seeds: [
        "metadata",
        addressEncoder.encode(METAPLEX_PROGRAM_ID),
        addressEncoder.encode(solAddress(mintAddress)),
      ],
    })

    const { value: metadataAccount } = await rpc
      .getAccountInfo(metadataPDA, { encoding: "base64" })
      .send()
    if (!metadataAccount) throw new Error(ERROR_NO_METADATA)

    const metadata = deserializeMetadata({
      publicKey: publicKey(metadataPDA),
      executable: metadataAccount.executable,
      owner: publicKey(metadataAccount.owner),
      lamports: sol(Number(metadataAccount.lamports)),
      data: Buffer.from(metadataAccount.data[0], "base64"),
    })

    const parsed = TokenCacheSchema.safeParse({
      id: tokenId,
      symbol: metadata.symbol.trim(),
      name: metadata.name.trim(),
      decimals: mint.decimals,
      isValid: true,
    })

    if (!parsed.success) throw new Error(ERROR_INVALID_DATA)

    return parsed.data
  } catch (err) {
    const msg = (err as Error).message

    if ([ERROR_NO_MINT, ERROR_NO_METADATA, ERROR_INVALID_DATA].includes(msg))
      return TokenCacheSchema.parse({
        id: tokenId,
        isValid: false,
      })

    log.warn("Failed to fetch sol-token2022 token data for %s", tokenId, { err })
  }

  return null
}
