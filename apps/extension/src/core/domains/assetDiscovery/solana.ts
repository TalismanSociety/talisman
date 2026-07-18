import { log } from "@common/log"
import { address as solAddress } from "@solana/kit"
import type { SolRpc } from "@talismn/chain-connectors"
import {
  networkIdFromTokenId,
  solSplTokenId,
  solToken2022TokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { isSolanaAddress } from "@talismn/crypto"
import { isAccountNotContact, isAccountPlatformSolana } from "@talismn/keyring"
import { throwAfter } from "@talismn/util"
import { isEqual, uniq } from "lodash-es"
import {
  combineLatest,
  delay,
  distinctUntilChanged,
  filter,
  first,
  map,
  pairwise,
  switchMap,
} from "rxjs"

import { isWalletReady$ } from "../../libs/isWalletReady"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { chaindataProvider } from "../../rpcs/chaindata"
import { balancesProvider } from "../balances/balancesProvider"
import { activeNetworksStore } from "../balances/store.activeNetworks"
import { activeTokensStore } from "../balances/store.activeTokens"
import { keyringStore } from "../keyring/store"
import { runDiscoveryTask } from "./scheduler"

const MAINNET_NETWORK_ID = "solana-mainnet"

/** Delay for the initial wallet-ready scan, to not interfere with startup routines. */
const WALLET_READY_DELAY_MS = 10_000

/**
 * Max duration of a single RPC lookup — a hung request would otherwise hold a
 * slot of the shared discovery queue and stall all discovery types.
 */
const RPC_TIMEOUT_MS = 10_000
const SPL_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

const discoverSolanaAssets = async (addresses?: string[]) => {
  const activeNetworks = await activeNetworksStore.get()
  if (activeNetworks[MAINNET_NETWORK_ID] === false) return

  const accounts = await keyringStore.getAccounts()
  addresses =
    addresses?.filter(isSolanaAddress) ??
    accounts
      .filter(isAccountNotContact)
      .filter(isAccountPlatformSolana)
      .map((acc) => acc.address)
  if (!addresses.length) return

  const rpc = await chainConnectorSol.getRpc(MAINNET_NETWORK_ID)
  const knownSplTokenIds = await chaindataProvider.getTokenIds("sol-spl")
  const knownToken2022Ids = await chaindataProvider.getTokenIds("sol-token2022")

  // shared discovery queue caps concurrent RPC work across all discovery
  // types (evm/substrate/solana) and spaces it out while a UI is open.
  // high priority: this scan must run first on startup, ahead of the
  // (potentially numerous, slow) substrate probes sharing the queue
  const results = await Promise.all(
    addresses.flatMap((address) => [
      runDiscoveryTask(() => getSplTokenIdsForOwner(rpc, address), { priority: 1 }),
      runDiscoveryTask(() => getToken2022IdsForOwner(rpc, address), { priority: 1 }),
    ])
  )

  const discoveredTokenIds = uniq(results.flat())
  const knownTokenIds = [...knownSplTokenIds, ...knownToken2022Ids]
  const splTokenIds = discoveredTokenIds.filter((id) => knownTokenIds.includes(id))

  const activeTokens = await activeTokensStore.get()
  const newTokenIds = splTokenIds.filter((id) => activeTokens[id] === undefined)

  if (newTokenIds.length) {
    log.debug("[discoverSolanaAssets] discovered new SPL/Token2022 tokens", { newTokenIds })

    await activeTokensStore.mutate((activeTokens) => ({
      ...activeTokens,
      ...Object.fromEntries(newTokenIds.map((id) => [id, true])),
    }))
  }
}

const getSplTokenIdsForOwner = async (rpc: SolRpc, address: string) => {
  try {
    // fetch SPL balances for the address
    const tokenAccounts = await Promise.race([
      rpc
        .getTokenAccountsByOwner(
          solAddress(address),
          { programId: solAddress(SPL_PROGRAM_ID) }, // SPL Token Program ID
          { commitment: "confirmed", encoding: "jsonParsed" }
        )
        .send(),
      throwAfter(RPC_TIMEOUT_MS, "Timeout"),
    ])

    const mintAddresses = tokenAccounts.value.map((d) => d.account.data.parsed.info.mint as string)
    return mintAddresses.map((mintAddress) => solSplTokenId(MAINNET_NETWORK_ID, mintAddress))
  } catch {
    return []
  }
}

const getToken2022IdsForOwner = async (rpc: SolRpc, address: string) => {
  try {
    const tokenAccounts = await Promise.race([
      rpc
        .getTokenAccountsByOwner(
          solAddress(address),
          { programId: solAddress(TOKEN_2022_PROGRAM_ID) },
          { commitment: "confirmed", encoding: "jsonParsed" }
        )
        .send(),
      throwAfter(RPC_TIMEOUT_MS, "Timeout"),
    ])

    const mintAddresses = tokenAccounts.value.map((d) => d.account.data.parsed.info.mint as string)
    return mintAddresses.map((mintAddress) => solToken2022TokenId(MAINNET_NETWORK_ID, mintAddress))
  } catch {
    return []
  }
}

export const initialiseSolanaAssetDiscovery = () => {
  // launch a scan when wallet is ready (unlocked and migrations are complete)
  isWalletReady$
    .pipe(
      filter((ready) => ready),
      first(),
      delay(WALLET_READY_DELAY_MS)
    )
    .subscribe(() => {
      log.debug("[discoverSolanaAssets] wallet is ready, launching scan")
      discoverSolanaAssets()
    })

  // launch a scan when solana-mainnet is enabled (only if it was not enabled before)
  combineLatest({
    isWalletReady: isWalletReady$,
    activeNetworks: activeNetworksStore.observable,
  })
    .pipe(
      filter(({ isWalletReady }) => !!isWalletReady),
      map(({ activeNetworks }) => !!activeNetworks["solana-mainnet"]),
      distinctUntilChanged(),
      pairwise(), // Emit pairs of [previous, current] enabled state
      filter(([previous, current]) => !previous && current) // Only emit when it changes from false to true
    )
    .subscribe(() => {
      log.debug("[discoverSolanaAssets] solana-mainnet enabled, launching scan")
      discoverSolanaAssets()
    })

  // launch a scan for newly added solana accounts
  combineLatest({ isWalletReady: isWalletReady$, accounts: keyringStore.accounts$ })
    .pipe(
      filter(({ isWalletReady }) => !!isWalletReady),
      map(({ accounts }) =>
        accounts
          .filter(isAccountNotContact)
          .filter(isAccountPlatformSolana)
          .map((acc) => acc.address)
      ),
      distinctUntilChanged<string[]>(isEqual),
      pairwise(), // Emit pairs of [previous, current] solana addresses
      filter(([previous, current]) => previous.length < current.length),
      map(([previous, current]) => current.filter((addr) => !previous.includes(addr))),
      filter((newAddresses) => !!newAddresses.length)
    )
    .subscribe((newSolanaAddresses) => {
      log.debug(
        "[discoverSolanaAssets] %s new solana accounts found, launching scan",
        newSolanaAddresses.length
      )
      discoverSolanaAssets(newSolanaAddresses)
    })

  // enable solana mainnet tokens found by balance modules (no scan needed)
  combineLatest({
    isWalletReady: isWalletReady$,
    accounts: keyringStore.accounts$,
  })
    .pipe(
      filter(({ isWalletReady }) => !!isWalletReady),
      map(({ accounts }) =>
        accounts
          .filter(isAccountNotContact)
          .filter(isAccountPlatformSolana)
          .map((acc) => acc.address)
      ),
      switchMap((addresses) =>
        combineLatest([...addresses.map(balancesProvider.getDetectedTokensId$)]).pipe(
          map((allTokenIds) => uniq(allTokenIds.flat()).sort())
        )
      ),
      distinctUntilChanged<TokenId[]>(isEqual)
    )
    .subscribe(async (tokenIds: TokenId[]) => {
      log.debug("[discoverSolanaAssets] detectedTokens$")

      const [activeTokens, existingTokenIds] = await Promise.all([
        activeTokensStore.get(),
        chaindataProvider.getTokenIds(),
      ])

      const tokenIdsToActivate = tokenIds.filter((tokenId) => {
        if (activeTokens[tokenId] !== undefined) return false // already set
        if (networkIdFromTokenId(tokenId) !== MAINNET_NETWORK_ID) return false // only process solana mainnet tokens
        return existingTokenIds.includes(tokenId) // consider only tokens that talisman knows about
      })

      if (tokenIdsToActivate.length) {
        log.debug("[discoverSolanaAssets] activating detected tokens:", tokenIdsToActivate)

        await activeTokensStore.mutate((prev) => {
          const next = { ...prev }
          for (const tokenId of tokenIdsToActivate) next[tokenId] = true
          return next
        })
      }
    })
}
