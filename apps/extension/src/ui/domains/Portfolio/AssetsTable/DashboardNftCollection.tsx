import { useSetting } from "@ui/hooks/useSettings"
import format from "date-fns/format"
import { Nft, NftCollection } from "extension-core"
import { FC, Suspense, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { useIntersection } from "react-use"

import { NftDialog } from "../NftDialog"
import { NftImage } from "../NftImage"
import { NftTile } from "../NftTile"
import { useSelectedAccount } from "../useSelectedAccount"
import { usePortfolioNftCollection } from "./usePortfolioNfts"

export const DashboardNftCollection = () => {
  const [viewMode] = useSetting("nftsViewMode")

  return (
    <div className="mt-7">
      <Suspense>{viewMode === "list" ? <NftsList /> : <NftsGrid />}</Suspense>
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
        </div>
      </div>
      <div className="text-right">{nft.name}</div>
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

  if (!nfts.length) return <NoNftFound />

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
    <NftTile
      imageUrl={imageUrl}
      onClick={onClick}
      label={nft.name ?? nft.tokenId ? `#${nft.tokenId}` : ""}
      networkIds={collection.evmNetworkIds}
    />
  )
}

const NftTileItem: FC<{ collection: NftCollection; nft: Nft; onClick: () => void }> = (props) => {
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
      if (collection) setDialogData({ nft, collection })
    },
    [collection]
  )

  if (!nfts.length) return <NoNftFound />

  return (
    <div className="flex flex-wrap justify-stretch gap-8">
      {!!collection &&
        nfts.map((nft, i) => (
          <NftTileItem
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
