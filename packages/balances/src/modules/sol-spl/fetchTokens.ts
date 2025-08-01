import { deserializeMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey, sol } from "@metaplex-foundation/umi"
import { MintLayout } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import { IChainConnectorSol } from "@talismn/chain-connectors"
import {
  parseSolSplTokenId,
  SolSplToken,
  solSplTokenId,
  SolSplTokenSchema,
} from "@talismn/chaindata-provider"
import { assign, omit } from "lodash-es"
import z from "zod/v4"

import log from "../../log"
import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE, PLATFORM, TokenConfig } from "./config"

const TokenCacheSchema = z.discriminatedUnion("isValid", [
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

type CachedToken = z.infer<typeof TokenCacheSchema>

const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
  cache,
}) => {
  const result: SolSplToken[] = []

  for (const tokenConfig of tokens) {
    const tokenId = solSplTokenId(networkId, tokenConfig.mintAddress)
    let cached = (cache[tokenId] && TokenCacheSchema.safeParse(cache[tokenId]).data) as
      | CachedToken
      | undefined

    if (!cached) {
      const tokenInfo = await fetchOnChainTokenData(connector, tokenId)
      if (tokenInfo) cache[tokenId] = tokenInfo
    }

    cached = (cache[tokenId] && TokenCacheSchema.safeParse(cache[tokenId]).data) as
      | CachedToken
      | undefined

    if (cached?.isValid === false) continue

    const base: Pick<SolSplToken, "id" | "type" | "networkId" | "platform"> = {
      id: tokenId,
      type: MODULE_TYPE,
      platform: PLATFORM,
      networkId,
    }

    const token = assign(
      base,
      cached?.isValid ? omit(cached, ["isValid"]) : {},
      tokenConfig,
    ) as SolSplToken

    const parsed = SolSplTokenSchema.safeParse(token)
    if (!parsed.success) {
      log.warn("Ignoring token with invalid SolSplTokenSchema", {
        token,
      })
      continue
    }

    result.push(parsed.data)
  }

  return result
}

const ERROR_NO_MINT = "No mint info available"
const ERROR_NO_METADATA = "No metadata account found"
const ERROR_INVALID_DATA = "Invalid on-chain data"

const fetchOnChainTokenData = async (connector: IChainConnectorSol, tokenId: string) => {
  try {
    const { networkId, mintAddress } = parseSolSplTokenId(tokenId)

    const connection = await connector.getConnection(networkId)
    if (!connection) {
      log.warn(`No connection found for network ${networkId}`)
      return null
    }

    const mintPubKey = new PublicKey(mintAddress)
    const mintInfo = await connection.getAccountInfo(mintPubKey)
    if (!mintInfo?.data) throw new Error(ERROR_NO_MINT)
    const mint = MintLayout.decode(mintInfo.data)

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mintPubKey.toBuffer()],
      METAPLEX_PROGRAM_ID,
    )

    // 3. Fetch metadata account directly (traditional way)
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

    log.warn("Failed to fetch sol-spl token data for %s", tokenId, { err })
  }

  return null
}
