import { StarIcon } from "@talismn/icons"
import { format } from "date-fns"
import { Nft, NftCollection } from "extension-core"
import { FC, Suspense, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { useIntersection } from "react-use"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useSetting } from "@ui/hooks/useSettings"

import { NftDialog } from "../NftDialog"
import { NftImage } from "../NftImage"
import { NftTile } from "../NftTile"
import { useSelectedAccount } from "../useSelectedAccount"
import { getNftLastAcquiredAt, getNftQuantity } from "./helpers"
import { useIsFavoriteNft } from "./useIsFavoriteNft"
import { usePortfolioNftCollection } from "./usePortfolioNfts"

export const PopupNftCollection: FC<{ className?: string }> = () => {
  const [viewMode] = useSetting("nftsViewMode")

  const [dialogNftId, setDialogNftId] = useState<string | null>(null)

  const handleNftClick = useCallback((nft: Nft) => {
    setDialogNftId(nft?.id)
  }, [])

  return (
    <div>
      <Suspense fallback={<SuspenseTracker name="PopupNftCollection" />}>
        {viewMode === "list" ? (
          <NftsRows onNftClick={handleNftClick} />
        ) : (
          <NftsTiles onNftClick={handleNftClick} />
        )}
        <NftDialog nftId={dialogNftId} onDismiss={() => setDialogNftId(null)} />
      </Suspense>
    </div>
  )
}

const NoNftFound = () => {
  const { t } = useTranslation()
  const { account } = useSelectedAccount()

  const msg = useMemo(
    () => (account ? t("No NFTs found for this account") : t("No NFTs found")),
    [account, t]
  )

  return <div className="text-body-secondary bg-field rounded px-8 py-36 text-center">{msg}</div>
}

const NftRowInner: FC<{
  collection: NftCollection
  nft: Nft
  onClick: () => void
}> = ({ collection, nft, onClick }) => {
  const imageUrl = useMemo(() => {
    return nft.previews.small ?? nft.imageUrl
  }, [nft.imageUrl, nft.previews.small])

  const isFavorite = useIsFavoriteNft(nft.id)

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-grey-900 hover:bg-grey-800 flex h-32 w-full  items-center gap-8 rounded-sm px-8 text-left"
    >
      <div className="flex grow items-center gap-6 overflow-hidden ">
        <NftImage className="size-16" src={imageUrl} alt={collection.name ?? ""} />
        <div className="flex grow gap-2 overflow-hidden">
          <div className="truncate text-base font-bold">{nft.name}</div>
          {isFavorite ? <StarIcon className="shrink-0 fill-[#D5FF5C] stroke-[#D5FF5C]" /> : null}
        </div>
      </div>
      <div className="text-right">{format(new Date(getNftLastAcquiredAt(nft)), "P")}</div>
    </button>
  )
}

const NftRow: FC<{
  collection: NftCollection
  nft: Nft
  onClick: () => void
}> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "400px",
  })

  return (
    <div ref={refContainer} className="h-32">
      {intersection?.isIntersecting ? <NftRowInner {...props} /> : null}
    </div>
  )
}

const NftsRows: FC<{ onNftClick: (nft: Nft) => void }> = ({ onNftClick }) => {
  const { collectionId } = useParams()
  const { collection, nfts } = usePortfolioNftCollection(collectionId)

  if (!nfts.length) return <NoNftFound />

  return (
    <div className="flex flex-col gap-5 text-sm">
      {!!collection &&
        nfts.map((nft, i) => (
          <NftRow
            key={`${collection.id}-TODO NFT ID-${i}`}
            collection={collection}
            nft={nft}
            onClick={() => onNftClick(nft)}
          />
        ))}
    </div>
  )
}

const NftTileInner: FC<{ collection: NftCollection; nft: Nft; onClick: () => void }> = ({
  collection,
  nft,
  onClick,
}) => {
  // favorites are the first ones in the list, can check just the first one
  const isFavorite = useIsFavoriteNft(nft.id)

  const imageUrl = useMemo(() => {
    return nft.previews.small ?? nft.imageUrl
  }, [nft.imageUrl, nft.previews.small])

  return (
    <NftTile
      isFavorite={isFavorite}
      imageUrl={imageUrl}
      onClick={onClick}
      label={nft.name ?? (nft.tokenId ? `#${nft.tokenId}` : "")}
      networkIds={collection.evmNetworkIds}
      count={getNftQuantity(nft)}
    />
  )
}

const NftTileItem: FC<{
  collection: NftCollection
  nft: Nft
  onClick: () => void
}> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="h-[19.6rem] w-[16.7rem]">
      {intersection?.isIntersecting ? <NftTileInner {...props} /> : null}
    </div>
  )
}

const NftsTiles: FC<{ onNftClick: (nft: Nft) => void }> = ({ onNftClick }) => {
  const { collectionId } = useParams()
  const { collection, nfts } = usePortfolioNftCollection(collectionId)

  if (!nfts.length) return <NoNftFound />

  return (
    <div className="grid w-full grid-cols-2 gap-8">
      {!!collection &&
        nfts.map((nft, i) => (
          <NftTileItem
            key={`${collection.id}-${nft.id}-${i}`}
            collection={collection}
            nft={nft}
            onClick={() => onNftClick(nft)}
          />
        ))}
    </div>
  )
}
