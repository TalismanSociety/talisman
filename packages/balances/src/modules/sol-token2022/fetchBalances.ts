import { address as solAddress } from "@solana/kit"
import { findAssociatedTokenPda } from "@solana-program/token"
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import {
  type SolToken2022Token,
  SolToken2022TokenSchema,
  solToken2022TokenId,
} from "@talismn/chaindata-provider"
import { isNotNil, LruMap } from "@talismn/util"
import { keyBy, uniq } from "lodash-es"

import log from "../../log"
import type { IBalance } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { setDetectedTokenIds } from "../shared/detectedTokens"
import { MODULE_TYPE, PLATFORM } from "./config"
import { type CachedToken, fetchOnChainTokenData } from "./onChainTokenMetadata"

const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

// In-memory metadata cache for unknown mints discovered during balance polling.
// Keyed by tokenId. Stores both successful metadata and known-invalid mints
// so we don't re-fetch the same mint on every 6s poll.
const dynamicTokenMetadataCache = new Map<string, CachedToken>()

// Deriving an associated token account address hashes until it finds an off-curve point,
// too costly to repeat for every token account on every poll.
const associatedTokenAccountCache = new LruMap<string, string>(1024)

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
          { programId: solAddress(TOKEN_2022_PROGRAM_ID) },
          { encoding: "jsonParsed" }
        )
        .send()

      // an address can hold a mint in more than one token account: its balance is the sum
      const tokenAccountHoldings = await Promise.all(
        tokenAccounts.value.map(async (d) => {
          try {
            const { mint: mintAddress, state, tokenAmount } = d.account.data.parsed.info
            const value = BigInt(tokenAmount.amount ?? "0")
            // transfers only spend from the associated token account, see getTransferCallData
            const isSpendable =
              value !== 0n &&
              state !== "frozen" &&
              d.pubkey === (await getAssociatedTokenAccount(address, mintAddress))
            return { mintAddress, value, isSpendable }
          } catch {
            log.warn("Failed to parse token amount", {
              address,
              d,
            })
            return null
          }
        })
      )

      const holdingsPerTokenId = new Map<string, { total: bigint; spendable: bigint }>()
      for (const { mintAddress, value, isSpendable } of tokenAccountHoldings.filter(isNotNil)) {
        const tokenId = solToken2022TokenId(networkId, mintAddress)

        // Only register mints with non-zero balance to avoid storing every
        // airdropped/spam token an account has ever received with 0 balance.
        if (!knownTokenIds.has(tokenId) && value !== 0n) unknownMints.add(mintAddress)

        const { total, spendable } = holdingsPerTokenId.get(tokenId) ?? { total: 0n, spendable: 0n }
        holdingsPerTokenId.set(tokenId, {
          total: total + value,
          spendable: spendable + (isSpendable ? value : 0n),
        })
      }

      const balances = [...holdingsPerTokenId].map(
        ([tokenId, { total, spendable }]): IBalance => ({
          tokenId,
          networkId,
          address,
          source: MODULE_TYPE,
          status: "live",
          ...(spendable === total
            ? { value: total.toString() }
            : {
                values: [
                  { type: "free", label: "free", amount: total.toString() },
                  { type: "locked", label: "locked", amount: (total - spendable).toString() },
                ],
              }),
        })
      )

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
  const dynamicTokens: SolToken2022Token[] = []
  if (unknownMints.size) {
    await Promise.all(
      Array.from(unknownMints).map(async (mintAddress) => {
        const tokenId = solToken2022TokenId(networkId, mintAddress)

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

        const token: SolToken2022Token = {
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

        const parsed = SolToken2022TokenSchema.safeParse(token)
        if (!parsed.success) {
          log.warn("Ignoring dynamic sol-token2022 token with invalid schema", { token })
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

  return { success, errors: [], dynamicTokens }
}

const getBalanceKey = (tokenId: string, address: string) => `${tokenId}:${address}`

const getAssociatedTokenAccount = async (owner: string, mint: string) => {
  const key = `${owner}:${mint}`
  const cached = associatedTokenAccountCache.get(key)
  if (cached) return cached

  const [associatedTokenAccount] = await findAssociatedTokenPda({
    mint: solAddress(mint),
    owner: solAddress(owner),
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  })
  associatedTokenAccountCache.set(key, associatedTokenAccount)
  return associatedTokenAccount
}
