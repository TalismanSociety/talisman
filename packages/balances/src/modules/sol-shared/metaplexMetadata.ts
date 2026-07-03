import { deserializeMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey, sol } from "@metaplex-foundation/umi"
import { getAddressEncoder, getProgramDerivedAddress, address as solAddress } from "@solana/kit"
import type { SolRpc } from "@talismn/chain-connectors"

const METAPLEX_PROGRAM_ID = solAddress("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

/** Derives the Metaplex metadata PDA for a mint. */
const deriveMetaplexMetadataPda = async (mintAddress: string) => {
  const addressEncoder = getAddressEncoder()
  const [metadataPDA] = await getProgramDerivedAddress({
    programAddress: METAPLEX_PROGRAM_ID,
    seeds: [
      "metadata",
      addressEncoder.encode(METAPLEX_PROGRAM_ID),
      addressEncoder.encode(solAddress(mintAddress)),
    ],
  })
  return metadataPDA
}

/**
 * Fetches and decodes the Metaplex metadata account for a mint.
 * Returns the trimmed symbol/name, or null when no metadata account exists.
 */
export const fetchMetaplexMetadata = async (
  rpc: SolRpc,
  mintAddress: string
): Promise<{ symbol: string; name: string } | null> => {
  const metadataPDA = await deriveMetaplexMetadataPda(mintAddress)

  const { value: metadataAccount } = await rpc
    .getAccountInfo(metadataPDA, { encoding: "base64" })
    .send()
  if (!metadataAccount) return null

  const metadata = deserializeMetadata({
    publicKey: publicKey(metadataPDA),
    executable: metadataAccount.executable,
    owner: publicKey(metadataAccount.owner),
    lamports: sol(Number(metadataAccount.lamports)),
    data: Buffer.from(metadataAccount.data[0], "base64"),
  })

  return { symbol: metadata.symbol.trim(), name: metadata.name.trim() }
}
