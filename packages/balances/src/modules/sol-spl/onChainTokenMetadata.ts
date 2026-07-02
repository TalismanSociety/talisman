import { deserializeMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey, sol } from "@metaplex-foundation/umi"
import { address as solAddress } from "@solana/kit"
import { MintLayout } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import type { IChainConnectorSol } from "@talismn/chain-connectors"
import { parseSolSplTokenId, SolSplTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import log from "../../log"

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

const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

const ERROR_NO_MINT = "No mint info available"
const ERROR_NO_METADATA = "No metadata account found"
const ERROR_INVALID_DATA = "Invalid on-chain data"

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

    const mintPubKey = new PublicKey(mintAddress)
    const { value: mintInfo } = await rpc
      .getAccountInfo(solAddress(mintAddress), { encoding: "base64" })
      .send()
    if (!mintInfo?.data) throw new Error(ERROR_NO_MINT)
    const mint = MintLayout.decode(Buffer.from(mintInfo.data[0], "base64"))

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mintPubKey.toBuffer()],
      METAPLEX_PROGRAM_ID
    )

    const { value: metadataAccount } = await rpc
      .getAccountInfo(solAddress(metadataPDA.toBase58()), { encoding: "base64" })
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

    log.warn("Failed to fetch sol-spl token data for %s", tokenId, { err })
  }

  return null
}
