import {
  ToolbarFilterIcon,
  ToolbarListIcon,
  ToolbarSortIcon,
  ToolbarTilesIcon,
} from "@talismn/icons"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useSetting } from "@ui/hooks/useSettings"
import { NftCollection, NftData } from "extension-core"
import { FC, SVGProps, Suspense, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"

import { NetworkPicker } from "../NetworkPicker"
import { NftImage } from "../NftImage"
import { getPortfolioNftCollectionPreviewUrl } from "../Nfts/helpers"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNfts } from "./usePortfolioNfts"

const ToolbarButton: FC<{ icon: FC<SVGProps<SVGSVGElement>>; onClick?: () => void }> = ({
  icon: Icon,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-grey-900 hover:bg-grey-800 text-body-secondary flex size-[3.6rem] items-center justify-center rounded-sm"
  >
    <Icon />
  </button>
)

export const DashboardNfts = () => {
  const [viewMode, setViewMode] = useSetting("nftsViewMode")

  const handleViewModeClick = useCallback(
    () => setViewMode((prev) => (prev === "list" ? "grid" : "list")),
    [setViewMode]
  )

  return (
    <div>
      <div className="flex w-full justify-between">
        <NetworkPicker />
        <div className="flex gap-4">
          <ToolbarButton icon={ToolbarSortIcon} />
          <ToolbarButton
            icon={viewMode === "list" ? ToolbarTilesIcon : ToolbarListIcon}
            onClick={handleViewModeClick}
          />
          <ToolbarButton icon={ToolbarListIcon} />
          <ToolbarButton icon={ToolbarFilterIcon} />
        </div>
      </div>
      <div className="mt-7">
        <Suspense>{viewMode === "list" ? <NftCollectionsList /> : <NftCollectionsGrid />}</Suspense>
      </div>
    </div>
  )
}

const NftCollectionRowInner: FC<{ collection: NftCollection; data: NftData }> = ({
  collection,
  data,
}) => {
  const nfts = useMemo(
    () => data.nfts.filter((nft) => nft.collectionId === collection.id),
    [collection.id, data.nfts]
  )

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
    // return (
    //   collection.imageUrl ??
    //   nfts.map((nft) => nft.previews.small ?? nft.imageUrl).find((url) => !!url) ??
    //   ""
    // )
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

  const floorUsdValue = useMemo(() => {
    const floorUsdValues = collection.marketplaces
      .filter((c) => c.floorUsd !== null)
      .map((c) => c.floorUsd!)
    return floorUsdValues.length ? Math.min(...floorUsdValues) : null
  }, [collection.marketplaces])

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    navigate(`/portfolio/nfts/${collection.id}`)
  }, [collection.id, navigate])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-grey-900 hover:bg-grey-800 grid h-32 w-full grid-cols-3 items-center gap-4 rounded-sm px-8 text-left"
    >
      <div className="flex items-center gap-6 overflow-hidden">
        <NftImage className="size-16" src={imageUrl} alt={collection.name ?? ""} />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="truncate text-base font-bold">{collection.name}</div>
          <div>
            <NetworksLogoStack networkIds={networkIds} />
          </div>
        </div>
      </div>
      <div className="text-right">
        {floorUsdValue !== null ? <Fiat amount={floorUsdValue} forceCurrency="usd" /> : null}
      </div>
      <div className="text-right">{nfts.length}</div>
    </button>
  )
}

const NftCollectionRow: FC<{ collection: NftCollection; data: NftData }> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="h-32">
      {intersection?.isIntersecting ? <NftCollectionRowInner {...props} /> : null}
    </div>
  )
}

const NftCollectionsList: FC = () => {
  const data = usePortfolioNfts()

  return (
    <div className="flex flex-col gap-5">
      <div className="text-primary-500">{status}</div>
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
  const nfts = useMemo(
    () => data.nfts.filter((nft) => nft.collectionId === collection.id),
    [collection.id, data.nfts]
  )

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
    // return (
    //   collection.imageUrl ??
    //   nfts.map((nft) => nft.previews.small ?? nft.imageUrl).find((url) => !!url) ??
    //   ""
    // )
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    // if more than one redirect to collection page
    // otherwise open the modal for the only NFT
    navigate(`/portfolio/nfts/${collection.id}`)
  }, [collection.id, navigate])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-body-secondary hover:text-body flex size-[22.2rem] flex-col items-center gap-4 overflow-hidden text-left"
    >
      <div className="w-full grow overflow-hidden">
        <NftImage
          className="h-full w-full object-cover"
          src={imageUrl}
          alt={collection.name ?? ""}
        />
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 overflow-hidden">
        <div className="grow truncate text-base">{collection.name}</div>
        <NetworksLogoStack networkIds={networkIds} />
      </div>
    </button>
  )
}

const NftCollectionTile: FC<{ collection: NftCollection; data: NftData }> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="size-[22rem]">
      {intersection?.isIntersecting ? <NftCollectionTileInner {...props} /> : null}
    </div>
  )
}

const NftCollectionsGrid: FC = () => {
  const data = usePortfolioNfts()

  return (
    <div className="flex flex-wrap gap-[2.5rem]">
      {data.collections.map((collection, i) => (
        <NftCollectionTile key={`${collection.id}-${i}`} collection={collection} data={data} />
      ))}
    </div>
  )
}
