import type { Account } from "@talismn/keyring"
import type { QueryResult } from "@talismn/util"
import { BehaviorSubject, filter, firstValueFrom, Subject } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AccountNft, AccountNfts, NftCollection } from "./types"

const mocks = vi.hoisted(() => ({
  accounts: [] as Account[],
  blob: null as unknown,
  evmNfts: vi.fn(),
  dotNfts$: undefined as Subject<QueryResult<AccountNfts>> | undefined,
}))

vi.mock("../keyring/store", () => ({
  keyringStore: { accounts$: new BehaviorSubject(mocks.accounts) },
}))

vi.mock("./fetchEvmAccountNfts", () => ({ fetchEvmAccountNfts: mocks.evmNfts }))

vi.mock("./fetchDotAccountNfts", () => {
  mocks.dotNfts$ = new Subject()
  return { getDotAccountNfts$: () => mocks.dotNfts$ }
})

vi.mock("./fetchEvmNftRefresh", () => ({ fetchEvmNftRefresh: vi.fn() }))

vi.mock("../../db", () => ({
  getBlobStore: () => ({ get: async () => mocks.blob, set: async () => {} }),
}))

vi.mock("../../libs/isWalletReady", () => ({ walletReady: Promise.resolve() }))

const ADDRESS = "0x5e9c3a2f9f1a7a1e0a7b7e4c5f1b2d3c4e5f6a7b"

const ETH_ACCOUNT: Account = {
  type: "watch-only",
  address: ADDRESS,
  name: "Both platforms",
  createdAt: 0,
  isPortfolio: true,
}

const collection = (id: string): NftCollection => ({
  id,
  name: id,
  description: "",
  iconUrl: null,
  bannerUrl: null,
  itemsCount: null,
  ownersCount: null,
  marketplaceUrls: [],
})

const nft = (id: string, collectionId: string): AccountNft => ({
  id,
  collectionId,
  tokenId: "1",
  networkId: "polkadot-asset-hub",
  type: "Polkadot NFT",
  previewUrl: null,
  imageUrl: null,
  videoUrl: null,
  audioUrl: null,
  name: id,
  contract: null,
  nftCollectionId: null,
  marketplaceUrls: [],
  traits: null,
  price: null,
  owner: ADDRESS,
  amount: 1,
  description: null,
  updatedAt: null,
})

const EVM_NFTS: AccountNfts = {
  nfts: [nft("evm:1:0xabc:1", "evm:1:0xabc")],
  collections: [collection("evm:1:0xabc")],
}

const DOT_NFTS: AccountNfts = {
  nfts: [nft("substrate:polkadot-asset-hub:Nfts:1:1", "substrate:polkadot-asset-hub:Nfts:1")],
  collections: [collection("substrate:polkadot-asset-hub:Nfts:1")],
}

const loadService = async () => {
  vi.resetModules()
  const [{ nfts$ }, { nftsStore$ }] = await Promise.all([import("./service"), import("./store")])
  return { nfts$, nftsStore$ }
}

const storedIds = (data: { nfts: AccountNft[] }) => data.nfts.map((stored) => stored.id).sort()

describe("nfts$", () => {
  beforeEach(() => {
    mocks.accounts.length = 0
    mocks.blob = null
    mocks.evmNfts.mockReset()
  })

  it("keeps an account's stored nfts until every source of that account has loaded", async () => {
    mocks.accounts.push(ETH_ACCOUNT)
    mocks.blob = { id: "nfts", ...DOT_NFTS, hiddenNftCollectionIds: [], favoriteNftIds: [] }
    mocks.evmNfts.mockResolvedValue(EVM_NFTS)
    const { nfts$, nftsStore$ } = await loadService()
    await firstValueFrom(nftsStore$.pipe(filter((data) => data.nfts.length > 0)))

    const subscription = nfts$.subscribe()
    mocks.dotNfts$?.next({ status: "loading", data: undefined, error: undefined })
    await vi.waitFor(() => expect(mocks.evmNfts).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(storedIds(await firstValueFrom(nftsStore$))).toEqual([DOT_NFTS.nfts[0].id])

    mocks.dotNfts$?.next({ status: "loaded", data: DOT_NFTS, error: undefined })

    await vi.waitFor(async () =>
      expect(storedIds(await firstValueFrom(nftsStore$))).toEqual(
        [DOT_NFTS.nfts[0].id, EVM_NFTS.nfts[0].id].sort()
      )
    )
    subscription.unsubscribe()
  })

  it("reports a wallet without nft accounts as loaded", async () => {
    const { nfts$ } = await loadService()

    const data = await firstValueFrom(nfts$)

    expect(data.status).toBe("loaded")
    expect(data.nfts).toEqual([])
  })
})
