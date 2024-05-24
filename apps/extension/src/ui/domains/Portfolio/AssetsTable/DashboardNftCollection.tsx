import {
  ToolbarFilterIcon,
  ToolbarListIcon,
  ToolbarSortIcon,
  ToolbarTilesIcon,
} from "@talismn/icons"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useSetting } from "@ui/hooks/useSettings"
import format from "date-fns/format"
import { Nft, NftCollection } from "extension-core"
import { FC, SVGProps, Suspense, useCallback, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useIntersection } from "react-use"

import { NetworkPicker } from "../NetworkPicker"
import { NftDialog } from "../NftDialog"
import { NftImage } from "../NftImage"
import { usePortfolioNftCollection } from "./usePortfolioNfts"

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

export const DashboardNftCollection = () => {
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
        <Suspense>{viewMode === "list" ? <NftsList /> : <NftsGrid />}</Suspense>
      </div>
    </div>
  )
}

const NftRowInner: FC<{ collection: NftCollection; nft: Nft; onClick: () => void }> = ({
  collection,
  nft,
  onClick,
}) => {
  const imageUrl = useMemo(() => {
    return nft.previews.small ?? nft.imageUrl
  }, [nft.imageUrl, nft.previews.small])

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-grey-900 hover:bg-grey-800 grid h-32 w-full grid-cols-3 items-center gap-4 rounded-sm px-8 text-left"
    >
      <div className="flex items-center gap-6 overflow-hidden">
        <NftImage className="size-16" src={imageUrl} alt={collection.name ?? ""} />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="truncate text-base font-bold">{nft.name}</div>
          {/* <div>
            <ChainLogo id={nft.evmNetworkId} />
          </div> */}
        </div>
      </div>
      <div className="text-right">
        {nft.name}
        {/* {floorUsdValue !== null ? <Fiat amount={floorUsdValue} forceCurrency="usd" /> : null} */}
      </div>
      <div className="text-right">
        {nft.acquiredAt ? format(new Date(nft.acquiredAt), "P") : null}
      </div>
    </button>
  )
}

const NftRow: FC<{ collection: NftCollection; nft: Nft; onClick: () => void }> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="h-32">
      {intersection?.isIntersecting ? <NftRowInner {...props} /> : null}
    </div>
  )
}

const NftsList: FC = () => {
  const { collectionId } = useParams()
  const { collection, nfts } = usePortfolioNftCollection(collectionId)

  const [dialogData, setDialogData] = useState<{ nft: Nft; collection: NftCollection }>()
  const handleClick = useCallback(
    (nft: Nft) => () => {
      if (collection) setDialogData({ nft, collection })
    },
    [collection]
  )

  return (
    <div className="flex flex-col gap-5">
      {!!collection &&
        nfts.map((nft, i) => (
          <NftRow
            key={`${collection.id}-TODO NFT ID-${i}`}
            collection={collection}
            nft={nft}
            onClick={handleClick(nft)}
          />
        ))}
      <NftDialog data={dialogData} />
    </div>
  )
}

const NftTileInner: FC<{ collection: NftCollection; nft: Nft; onClick: () => void }> = ({
  collection,
  nft,
  onClick,
}) => {
  const imageUrl = useMemo(() => {
    return nft.previews.small ?? nft.imageUrl
  }, [nft.imageUrl, nft.previews.small])

  return (
    <button
      type="button"
      onClick={onClick}
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
        <div className="grow truncate text-base">{nft.name || `#TODO_TOKEN_ID`}</div>
        <ChainLogo id={nft.evmNetworkId} />
      </div>
    </button>
  )
}

const NftTile: FC<{ collection: NftCollection; nft: Nft; onClick: () => void }> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="size-[22.2rem]">
      {intersection?.isIntersecting ? <NftTileInner {...props} /> : null}
    </div>
  )
}

const NftsGrid: FC = () => {
  const { collectionId } = useParams()
  const { collection, nfts } = usePortfolioNftCollection(collectionId)

  const [dialogData, setDialogData] = useState<{ nft: Nft; collection: NftCollection }>()
  const handleClick = useCallback(
    (nft: Nft) => () => {
      //      console.log({ nft, collection })
      if (collection) setDialogData({ nft, collection })
    },
    [collection]
  )

  // console.log({ dialogData })

  return (
    <div className="flex flex-wrap justify-stretch gap-8">
      {!!collection &&
        nfts.map((nft, i) => (
          <NftTile
            key={`${collection.id}-TODO NFT ID-${i}`}
            collection={collection}
            nft={nft}
            onClick={handleClick(nft)}
          />
        ))}
      <NftDialog data={dialogData} />
    </div>
  )
}
