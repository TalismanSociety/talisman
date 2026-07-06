import { address as solAddress } from "@solana/kit"
import { type SolSplToken, SolSplTokenSchema, solSplTokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { keyBy, uniq } from "lodash-es"

import log from "../../log"
import type { IBalance } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { setDetectedTokenIds } from "../shared/detectedTokens"
import { MODULE_TYPE, PLATFORM } from "./config"
import { type CachedToken, fetchOnChainTokenData } from "./onChainTokenMetadata"

const SPL_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

// In-memory metadata cache for unknown mints discovered during balance polling.
// Keyed by tokenId. Stores both successful metadata and known-invalid mints
// so we don't re-fetch the same mint on every 6s poll.
const dynamicTokenMetadataCache = new Map<string, CachedToken>()

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const rpc = await connector.getRpc(networkId)
  if (!rpc) throw new Error(`Could not get connection for Solana network ${networkId}`)

  const accountAddresses = uniq(tokensWithAddresses.flatMap(([, addresses]) => addresses))
  const knownTokenIds = new Set(tokensWithAddresses.map(([token]) => token.id))

  // mints discovered on-chain that are not yet in chaindata (deduped across addresses)
  const unknownMints = new Set<string>()

  const balancesPerAddress = await Promise.all(
    accountAddresses.map(async (address) => {
      const tokenAccounts = await rpc
        .getTokenAccountsByOwner(
          solAddress(address),
          { programId: solAddress(SPL_PROGRAM_ID) }, // SPL Token Program ID
          { encoding: "jsonParsed" }
        )
        .send()

      const balances = tokenAccounts.value
        .map((d): IBalance | null => {
          try {
            const mintAddress = d.account.data.parsed.info.mint
            const value = d.account.data.parsed.info.tokenAmount.amount ?? "0"
            const tokenId = solSplTokenId(networkId, mintAddress)

            // Only register mints with non-zero balance to avoid storing every
            // airdropped/spam token an account has ever received with 0 balance.
            if (!knownTokenIds.has(tokenId) && value !== "0") unknownMints.add(mintAddress)

            return {
              tokenId,
              networkId,
              address,
              source: MODULE_TYPE,
              status: "live",
              value,
            }
          } catch {
            log.warn("Failed to parse token amount", {
              address,
              d,
            })
            return null
          }
        })
        .filter(isNotNil)

      // allows the wallet to detect new tokens, and enable them automatically
      setDetectedTokenIds(
        address,
        MODULE_TYPE,
        balances.map((b) => b.tokenId)
      )

      return [address, balances] as const
    })
  )

  // Fetch metadata for newly-discovered mints (skipping any already cached).
  // Cached entries (both valid and invalid) are reused to avoid re-querying every poll.
  const dynamicTokens: SolSplToken[] = []
  if (unknownMints.size) {
    await Promise.all(
      Array.from(unknownMints).map(async (mintAddress) => {
        const tokenId = solSplTokenId(networkId, mintAddress)

        let cached = dynamicTokenMetadataCache.get(tokenId)
        if (!cached) {
          const fetched = await fetchOnChainTokenData(connector, tokenId)
          if (fetched) {
            dynamicTokenMetadataCache.set(tokenId, fetched)
            cached = fetched
          }
        }

        // Skip mints whose metadata fetch failed or returned invalid data.
        if (!cached?.isValid) return

        const token: SolSplToken = {
          id: tokenId,
          type: MODULE_TYPE,
          platform: PLATFORM,
          networkId,
          mintAddress,
          isDefault: true,
          symbol: cached.symbol,
          decimals: cached.decimals,
          ...(cached.name !== undefined ? { name: cached.name } : {}),
          ...(cached.logo !== undefined ? { logo: cached.logo } : {}),
        }

        const parsed = SolSplTokenSchema.safeParse(token)
        if (!parsed.success) {
          log.warn("Ignoring dynamic sol-spl token with invalid schema", { token })
          return
        }

        dynamicTokens.push(parsed.data)
      })
    )
  }

  // Set of token ids we successfully registered as dynamic this run; used to
  // include their balances in `success` immediately rather than waiting for the
  // next poll cycle.
  const registeredDynamicIds = new Set(dynamicTokens.map((t) => t.id))

  const allBalancesByKey = keyBy(
    balancesPerAddress.flatMap(([, addressBalances]) => addressBalances),
    (b) => getBalanceKey(b.tokenId, b.address)
  )

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  // return a balance entry for all token/address pairs that were requested
  const success: IBalance[] = balanceDefs.map((bd): IBalance => {
    const found = allBalancesByKey[getBalanceKey(bd.token.id, bd.address)]
    return (
      found ?? {
        tokenId: bd.token.id,
        networkId: bd.token.networkId,
        address: bd.address,
        source: MODULE_TYPE,
        status: "live",
        value: "0",
      }
    )
  })

  // also surface balances for newly-registered dynamic tokens so their value
  // appears on the same emission that triggers their registration
  for (const balance of balancesPerAddress.flatMap(([, addressBalances]) => addressBalances)) {
    if (registeredDynamicIds.has(balance.tokenId)) success.push(balance)
  }

  return { success, errors: [], dynamicTokens } // TODO output errors if any
}

const getBalanceKey = (tokenId: string, address: string) => `${tokenId}:${address}`
