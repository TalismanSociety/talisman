import { classNames } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useSetting } from "@ui/hooks/useSettings"
import { Nft, NftCollection, NftData } from "extension-core"
import { FC, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"

import { NftDialog } from "../NftDialog"
import { NftImage } from "../NftImage"
import { getPortfolioNftCollectionPreviewUrl } from "../Nfts/helpers"
import { NftTile } from "../NftTile"
import { usePortfolioSearch } from "../usePortfolio"
import { useSelectedAccount } from "../useSelectedAccount"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNfts } from "./usePortfolioNfts"

const NoNftFound = () => {
  const { t } = useTranslation()
  const { account } = useSelectedAccount()

  const msg = useMemo(
    () => (account ? t("No NFTs found for this account") : t("No NFTs found")),
    [account, t]
  )

  return <div className="text-body-secondary bg-field rounded px-8 py-36 text-center">{msg}</div>
}

export const PopupNfts: FC<{ className?: string }> = () => {
  const [viewMode] = useSetting("nftsViewMode")
  const data = usePortfolioNfts()
  const { search } = usePortfolioSearch()

  const filteredData = useMemo<NftData>(() => {
    if (!search) return data

    const searchLower = search.toLowerCase()
    const collections = data.collections.filter(
      (collection) =>
        collection.name?.toLowerCase().includes(searchLower) ||
        collection.description?.toLowerCase().includes(searchLower)
    )
    const nfts = data.nfts.filter(
      (nft) =>
        nft.name?.toLowerCase().includes(searchLower) ||
        nft.description?.toLowerCase().includes(searchLower)
    )

    // keep all collections that are matched themselves, or that include a matched NFT
    const collectionIds = [
      ...new Set([...collections.map((c) => c.id), nfts.map((n) => n.collectionId)]),
    ]

    return {
      ...data,
      collections: data.collections.filter((c) => collectionIds.includes(c.id)),
      nfts: data.nfts.filter((nft) => collectionIds.includes(nft.collectionId)),
    }
  }, [data, search])

  return (
    <div className="mt-7">
      {!data.collections.length ? (
        <NoNftFound />
      ) : viewMode === "list" ? (
        <NftCollectionsList data={filteredData} />
      ) : (
        <NftCollectionsGrid data={filteredData} />
      )}
    </div>
  )
}

const NftCollectionRowInner: FC<{ collection: NftCollection; data: NftData }> = ({
  collection,
  data,
}) => {
  const [nftDialogInputs, setNftDialogInputs] = useState<{ collection: NftCollection; nft: Nft }>()

  const nfts = useMemo(
    () => data.nfts.filter((nft) => nft.collectionId === collection.id),
    [collection.id, data.nfts]
  )

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

  const floorUsdValue = useMemo(() => {
    const floorUsdValues = collection.marketplaces
      .filter((c) => c.floorUsd !== null)
      .map((c) => c.floorUsd!)
    return floorUsdValues.length ? Math.min(...floorUsdValues) : null
  }, [collection.marketplaces])

  const { t } = useTranslation()

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (nfts.length === 1) setNftDialogInputs({ collection, nft: nfts[0] })
    else navigate(`/portfolio/nfts/${collection.id}`)
  }, [collection, navigate, nfts])

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="bg-grey-900 hover:bg-grey-800 flex h-32 w-full  items-center gap-8 rounded-sm px-8 text-left"
      >
        <div className="flex grow items-center gap-6 overflow-hidden ">
          <NftImage className="size-16" src={imageUrl} alt={collection.name ?? ""} />
          <div className="flex grow flex-col gap-2 overflow-hidden">
            <div className="truncate text-base font-bold">{collection.name}</div>
            <div>
              <NetworksLogoStack networkIds={networkIds} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div>
            <span className="font-bold">{nfts.length}</span>{" "}
            {nfts.length > 1 ? t("NFTs") : t("NFT")}
          </div>
          <div
            className={classNames(
              "text-body-secondary ",
              floorUsdValue === null && "select-none text-transparent"
            )}
          >
            {floorUsdValue !== null ? (
              <Fiat amount={floorUsdValue} forceCurrency="usd" noCountUp />
            ) : (
              "N/A"
            )}
          </div>
        </div>
      </button>

      <NftDialog data={nftDialogInputs} />
    </>
  )
}

const NftCollectionRow: FC<{ collection: NftCollection; data: NftData }> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "400px",
  })

  return (
    <div ref={refContainer} className="h-32">
      {intersection?.isIntersecting ? <NftCollectionRowInner {...props} /> : null}
    </div>
  )
}

const NftCollectionsList: FC<{ data: NftData }> = ({ data }) => {
  return (
    <div className="flex flex-col gap-5 text-sm">
      {data.collections.map((collection, i) => (
        <NftCollectionRow key={`${collection.id}-${i}`} collection={collection} data={data} />
      ))}
    </div>
  )
}

const NftCollectionTileInner: FC<{ collection: NftCollection; data: NftData }> = ({
  collection,
  data,
}) => {
  const [nftDialogInputs, setNftDialogInputs] = useState<{ collection: NftCollection; nft: Nft }>()

  const nfts = useMemo(
    () => data.nfts.filter((nft) => nft.collectionId === collection.id),
    [collection.id, data.nfts]
  )

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (nfts.length === 1) setNftDialogInputs({ collection, nft: nfts[0] })
    else navigate(`/portfolio/nfts/${collection.id}`)
  }, [collection, navigate, nfts])

  return (
    <>
      <NftTile
        imageUrl={imageUrl}
        label={collection.name ?? ""}
        networkIds={networkIds}
        onClick={handleClick}
      />
      {/* <button
        type="button"
        onClick={handleClick}
        className="text-body-secondary hover:text-grey-300 group flex size-full flex-col gap-4 overflow-hidden text-left"
      >
        <div className="size-[16.7rem] grow overflow-hidden rounded-sm">
          <NftImage
            className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            src={imageUrl}
            alt={collection.name ?? ""}
          />
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 overflow-hidden">
          <div className="grow truncate text-base">{collection.name}</div>
          <NetworksLogoStack className="shrink-0" networkIds={networkIds} />
        </div>
      </button> */}

      <NftDialog data={nftDialogInputs} />
    </>
  )
}

const NftCollectionTile: FC<{ collection: NftCollection; data: NftData }> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="h-[19.6rem] w-[16.7rem]">
      {intersection?.isIntersecting ? <NftCollectionTileInner {...props} /> : null}
    </div>
  )
}

const NftCollectionsGrid: FC<{ data: NftData }> = ({ data }) => {
  return (
    <div className="grid w-full grid-cols-2 gap-8">
      {data.collections.map((collection, i) => (
        <NftCollectionTile key={`${collection.id}-${i}`} collection={collection} data={data} />
      ))}
    </div>
  )
}
