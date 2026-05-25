import { deserializeMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey, sol } from "@metaplex-foundation/umi"
import { MintLayout } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import type { IChainConnectorSol } from "@talismn/chain-connectors"
import { parseSolToken2022TokenId, SolToken2022TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import log from "../../log"

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

const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

const ERROR_NO_MINT = "No mint info available"
const ERROR_NO_METADATA = "No metadata account found"
const ERROR_INVALID_DATA = "Invalid on-chain data"

export const fetchOnChainTokenData = async (
  connector: IChainConnectorSol,
  tokenId: string
): Promise<CachedToken | null> => {
  try {
    const { networkId, mintAddress } = parseSolToken2022TokenId(tokenId)

    const connection = await connector.getConnection(networkId)
    if (!connection) {
      log.warn(`No connection found for network ${networkId}`)
      return null
    }

    const mintPubKey = new PublicKey(mintAddress)
    const mintInfo = await connection.getAccountInfo(mintPubKey)
    if (!mintInfo?.data) throw new Error(ERROR_NO_MINT)

    // Token 2022 accounts may be larger than the standard 82-byte mint layout
    // due to TLV-encoded extensions appended after the base layout.
    // MintLayout only decodes the first 82 bytes (the base layout), which is safe.
    const mint = MintLayout.decode(mintInfo.data)

    // Try on-chain Token 2022 metadata extension first (stored in the mint account itself)
    const token2022Metadata = tryParseToken2022Metadata(mintInfo.data)
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
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mintPubKey.toBuffer()],
      METAPLEX_PROGRAM_ID
    )

    const metadataAccount = await connection.getAccountInfo(new PublicKey(metadataPDA))
    if (!metadataAccount) throw new Error(ERROR_NO_METADATA)

    const metadata = deserializeMetadata({
      publicKey: publicKey(metadataPDA),
      executable: metadataAccount.executable,
      owner: publicKey(metadataAccount.owner),
      lamports: sol(metadataAccount.lamports),
      data: metadataAccount.data,
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

/**
 * Attempts to parse Token 2022 on-chain metadata from a mint account's TLV extensions.
 *
 * The TokenMetadata extension uses type discriminator 19 (0x13, 0x00 little-endian).
 * Layout after the 2-byte type: 2-byte length, then the metadata fields:
 *   - updateAuthority (32 bytes)
 *   - mint (32 bytes)
 *   - name (4-byte length prefix + UTF-8)
 *   - symbol (4-byte length prefix + UTF-8)
 *   - uri (4-byte length prefix + UTF-8)
 */
const tryParseToken2022Metadata = (
  data: Buffer
): { name: string; symbol: string; uri: string } | null => {
  try {
    // Token 2022 extensions start after the base mint layout (82 bytes)
    // plus a padding/account type byte. The TLV region starts at offset 166.
    const TLV_START = 166
    if (data.length <= TLV_START) return null

    let offset = TLV_START
    while (offset + 4 <= data.length) {
      const extType = data.readUInt16LE(offset)
      const extLen = data.readUInt16LE(offset + 2)
      const extDataStart = offset + 4

      // TokenMetadata extension type = 19
      if (extType === 19 && extDataStart + extLen <= data.length) {
        let pos = extDataStart
        // Skip updateAuthority (32 bytes) + mint (32 bytes)
        pos += 64

        const readLenPrefixed = (): string => {
          if (pos + 4 > data.length) throw new Error("out of bounds")
          const len = data.readUInt32LE(pos)
          pos += 4
          if (pos + len > data.length) throw new Error("out of bounds")
          const str = data.subarray(pos, pos + len).toString("utf8")
          pos += len
          return str
        }

        const name = readLenPrefixed()
        const symbol = readLenPrefixed()
        const uri = readLenPrefixed()

        if (name && symbol) return { name, symbol, uri }
      }

      offset = extDataStart + extLen
    }
  } catch {
    // Fall through to return null
  }

  return null
}
