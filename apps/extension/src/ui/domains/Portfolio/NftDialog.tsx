import { ChevronLeftIcon, MoreHorizontalIcon, StarIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import format from "date-fns/format"
import { Nft, NftCollection, NftCollectionMarketplace } from "extension-core"
import { log } from "extension-shared"
import { useAtomValue } from "jotai"
import {
  CSSProperties,
  FC,
  PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  IconButton,
  Modal,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
} from "talisman-ui"

import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { Tabs } from "@talisman/components/Tabs"
import { api } from "@ui/api"
import {
  isFavoriteNftAtomFamily,
  isHiddenNftCollectionAtomFamily,
  nftDataAtomFamily,
} from "@ui/atoms"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { IS_POPUP } from "@ui/util/constants"

import { AccountIcon } from "../Account/AccountIcon"
import { Address } from "../Account/Address"
import { NetworkAddress } from "../Account/AddressLinkOrCopy"
import { ChainLogo } from "../Asset/ChainLogo"
import { Fiat } from "../Asset/Fiat"
import { NftImage } from "./NftImage"

const NftContextMenu: FC<{ nft: Nft }> = ({ nft }) => {
  const { t } = useTranslation()

  const handleOpenUrl = useCallback(
    (url: string) => () => {
      window.open(url, "_blank", "")
    },
    []
  )

  const isCollectionHidden = useAtomValue(isHiddenNftCollectionAtomFamily(nft.collectionId))

  const handleHideCollectionClick = useCallback(() => {
    api.nftsSetHidden(nft.collectionId, !isCollectionHidden)
  }, [isCollectionHidden, nft.collectionId])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const hadnleRefreshMetadataClick = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)

    const notificationId = notify(
      {
        type: "processing",
        title: t("Requesting refresh"),
        subtitle: t("Please wait"),
      },
      { autoClose: false }
    )

    try {
      await api.nftsRefreshMetadata(nft.id)

      notifyUpdate(notificationId, {
        type: "success",
        title: t("Request succeeded"),
        subtitle: t("Come back in few minutes"),
      })
    } catch (err) {
      log.error("Failed to refresh metadata", { err })
      notifyUpdate(notificationId, {
        type: "error",
        title: t("Request failed"),
        subtitle: (err as Error)?.message ?? "",
      })
    }
    setIsRefreshing(false)
  }, [isRefreshing, nft.id, t])

  useEffect(() => {
    setIsRefreshing(false)
  }, [nft.id])

  return (
    <ContextMenu>
      <ContextMenuTrigger className="text-body-secondary hover:text-body">
        <MoreHorizontalIcon className="size-12" />
      </ContextMenuTrigger>
      <ContextMenuContent>
        {nft.marketplaces.map((mp, i) => (
          <ContextMenuItem key={i} onClick={handleOpenUrl(mp.url)}>
            {t("Open in {{marketplace}}", { marketplace: mp.name })}
          </ContextMenuItem>
        ))}
        <ContextMenuItem onClick={handleHideCollectionClick}>
          {isCollectionHidden ? t("Show collection") : t("Hide collection")}
        </ContextMenuItem>
        <ContextMenuItem onClick={hadnleRefreshMetadataClick}>
          {t("Refresh Metadata")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

type MarketPlaceWithFloor = NftCollectionMarketplace & { floorUsd: number }

const TabContentCollection: FC<{
  collection: NftCollection
  nft: Nft
}> = ({ collection, nft }) => {
  const { t } = useTranslation()
  const network = useEvmNetwork(nft.evmNetworkId)

  const floorPrice = useMemo(() => {
    const floorPrices = collection?.marketplaces
      .filter((mp): mp is MarketPlaceWithFloor => typeof mp.floorUsd === "number")
      .sort((mp1, mp2) => mp1.floorUsd - mp2.floorUsd)

    return floorPrices.length ? floorPrices[0].floorUsd : null
  }, [collection?.marketplaces])

  return (
    <>
      <div className="leading-paragraph grid grid-cols-2 gap-8">
        <div className="text-body-secondary">{t("Floor Price")}</div>
        <div className="text-right">
          {floorPrice ? <Fiat amount={floorPrice} forceCurrency="usd" /> : t("Unavailable")}
        </div>
        <div className="text-body-secondary">{t("Items")}</div>
        <div className="text-right">{collection.totalQuantity}</div>
        <div className="text-body-secondary">{t("Holders")}</div>
        <div className="text-right">{collection.distinctOwners}</div>
        <div className="text-body-secondary">{t("Network")}</div>
        <div className="flex items-center justify-end gap-[0.5em]">
          <ChainLogo id={nft.evmNetworkId} className="text-md" />
          <div className="truncate">{network?.name}</div>
        </div>
        <div className="text-body-secondary">{t("Contract")}</div>
        <div className="text-right">
          <NetworkAddress address={nft.contractAddress} networkId={nft.evmNetworkId} />
        </div>
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      {!!collection.description && (
        <div className="space-y-8 hyphens-auto">
          <div className="text-body-secondary">{t("Description")}</div>
          <div>{collection.description}</div>
        </div>
      )}
    </>
  )
}

const TabContentNft: FC<{
  nft: Nft
}> = ({ nft }) => {
  const { t } = useTranslation()

  return (
    <>
      <div className="leading-paragraph grid grid-cols-2 gap-8">
        {!!nft.tokenId && (
          <>
            <div className="text-body-secondary">{t("Token ID")}</div>
            <div className="flex items-center justify-end gap-[0.5em]">{nft.tokenId}</div>
          </>
        )}
        {nft.owner && (
          <>
            <div className="text-body-secondary">{t("Owner")}</div>
            <div className="flex items-center justify-end gap-[0.5em]">
              <AccountIcon address={nft.owner} className="text-md" />
              <div className="truncate">
                <Address address={nft.owner} />
              </div>
            </div>
            <div className="text-body-secondary">{t("Acquired on")}</div>
            <div className="text-right">
              {nft.acquiredAt ? format(new Date(nft.acquiredAt), "P") : null}
            </div>
          </>
        )}
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      {!!nft.description && (
        <div className="space-y-8">
          <div className="text-body-secondary">{t("Description")}</div>
          <div>{nft.description}</div>
        </div>
      )}
      {!!nft.properties.length && (
        <div className="space-y-8">
          <div className="text-body-secondary">{t("Properties")}</div>
          <div className="flex flex-wrap gap-4">
            {nft.properties.map(({ name, value }, i) => (
              <div key={i} className="rounded-xs bg-grey-800 px-5 py-2">
                <div className="text-body-secondary text-xs">{name}</div>
                <div className="text-sm">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const ScrollableArea: FC<
  PropsWithChildren & { paddingRight: number; className?: string; innerClassName?: string }
> = ({ paddingRight, className, innerClassName, children }) => {
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const refContainer = useRef<HTMLDivElement>(null)
  const refContent = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollable = refContainer.current
    const content = refContent.current
    if (!scrollable || !content) return

    const handleDetectScroll = () => {
      if (scrollable.clientWidth < 400)
        setScrollbarWidth(paddingRight) // portrait, use dialog's scrollbar
      else setScrollbarWidth(Math.round(scrollable.offsetWidth - scrollable.clientWidth)) // landscape, custom toolbar
    }

    const mutationCallback: MutationCallback = (mutationList) => {
      if (mutationList.some(({ type }) => type === "childList")) handleDetectScroll()
    }

    // observe content changes
    const observer = new MutationObserver(mutationCallback)
    observer.observe(content, { attributes: false, childList: true, subtree: true })

    // listen for resize events
    scrollable.addEventListener("resize", handleDetectScroll)
    content.addEventListener("resize", handleDetectScroll)
    window.addEventListener("resize", handleDetectScroll)

    // init
    handleDetectScroll()

    return () => {
      scrollable.removeEventListener("resize", handleDetectScroll)
      content.removeEventListener("resize", handleDetectScroll)
      window.removeEventListener("resize", handleDetectScroll)
      observer.disconnect()
    }
  }, [paddingRight, refContainer])

  const style = useMemo<CSSProperties>(() => {
    return { paddingRight: paddingRight - scrollbarWidth }
  }, [paddingRight, scrollbarWidth])

  return (
    <div
      ref={refContainer}
      className={classNames("scrollable scrollable-700 w-full grow overflow-y-auto", className)}
      style={style}
    >
      <div ref={refContent} className={classNames("w-full", innerClassName)}>
        {children}
      </div>
    </div>
  )
}

const FavoriteButton: FC<{ nftId: string }> = ({ nftId }) => {
  const isFavorite = useAtomValue(isFavoriteNftAtomFamily(nftId))

  const handleClick = useCallback(() => {
    api.nftsSetFavorite(nftId, !isFavorite)
  }, [isFavorite, nftId])

  return (
    <IconButton onClick={handleClick}>
      <StarIcon className={classNames(isFavorite && "fill-[#D5FF5C] stroke-[#D5FF5C]")} />
    </IconButton>
  )
}

const DialogContent: FC<{ onDismiss: () => void; collection: NftCollection; nft: Nft }> = ({
  onDismiss,
  collection,
  nft,
}) => {
  const { t } = useTranslation()

  const [tab, setTab] = useState("collection")
  const tabs = useMemo(
    () => [
      { label: t("Collection"), value: "collection" },
      { label: t("NFT"), value: "nft" },
    ],
    [t]
  )

  const handleFullScreenViewClick = () => {
    if (nft.imageUrl) window.open(nft.imageUrl, "_blank", "noopener noreferrer")
  }

  return (
    <div
      className={classNames(
        "h-full w-full",
        "@2xl:overflow-hidden",
        "bg-black shadow",
        "@2xl:grid-cols-2 @2xl:grid"
      )}
    >
      <div className="@2xl:block hidden">
        <Tooltip>
          <TooltipTrigger onClick={handleFullScreenViewClick} asChild>
            <div className="h-full w-full shrink-0 cursor-pointer ">
              <NftImage className="h-full w-full rounded-r-none object-cover" src={nft.imageUrl} />
            </div>
          </TooltipTrigger>
          {!!nft.imageUrl && <TooltipContent>{t("View in full screen")}</TooltipContent>}
        </Tooltip>
      </div>
      <div
        className={classNames(
          "flex h-full grow flex-col overflow-y-auto font-light",
          "@2xl:overflow-hidden"
        )}
      >
        <div className="@2xl:bg-transparent @2xl:px-12 @2xl:py-8 flex w-full items-center gap-4 bg-black px-8 py-6">
          <IconButton className="@2xl:hidden" onClick={onDismiss}>
            <ChevronLeftIcon />
          </IconButton>
          <div className="grow">
            <div className="text-body-secondary leading-paragraph">{collection.name}</div>
            <div className="text-body @2xl:leading-paragraph @2xl:text-lg font-bold">
              {nft.name}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <FavoriteButton nftId={nft.id} />
            <NftContextMenu nft={nft} />
          </div>
        </div>
        <div className="@2xl:hidden bg-grey-800 block h-[38.5rem] shrink-0 p-8">
          <Tooltip>
            <TooltipTrigger onClick={handleFullScreenViewClick} asChild>
              <div className="size-full cursor-pointer rounded-lg bg-black">
                <NftImage className="size-full object-cover" src={nft.imageUrl} />
              </div>
            </TooltipTrigger>
            {!!nft.imageUrl && <TooltipContent>{t("View in full screen")}</TooltipContent>}
          </Tooltip>
        </div>
        <div className="@2xl:overflow-hidden @2xl:pr-0 flex grow flex-col gap-12 px-12 py-8 font-light">
          <div className="@2xl:pr-12">
            <Tabs tabs={tabs} selected={tab} onChange={setTab} className="m-0 w-full text-base " />
          </div>
          <div className="@2xl:pr-1 grow overflow-hidden">
            <ScrollableArea
              // scrollbar should be centered into the 24px empty space used as right-padding for the modal
              paddingRight={20}
              className="h-full w-full"
              innerClassName="leading-paragraph flex flex-col gap-12 text-base font-light"
            >
              {tab === "collection" && <TabContentCollection collection={collection} nft={nft} />}
              {tab === "nft" && <TabContentNft nft={nft} />}
            </ScrollableArea>
          </div>
        </div>
      </div>
    </div>
  )
}

const NftDialogInner: FC<{
  data: { nft: Nft; collection: NftCollection } | null | undefined
  onDismiss: () => void
}> = ({ data, onDismiss }) => {
  const { isOpen, open, close } = useOpenClose()
  const [current, setCurrent] = useState<{ nft: Nft; collection: NftCollection }>()

  useEffect(() => {
    if (data) {
      setCurrent(data)
      open()
    } else close()
  }, [data, open, close])

  const handleDismiss = useCallback(() => {
    onDismiss()
    close()
  }, [close, onDismiss])

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={handleDismiss}
      className={classNames(
        "@container h-[60rem] w-[40rem] overflow-hidden bg-black",
        !IS_POPUP && "lg:w-[100rem] lg:rounded-lg"
      )}
      containerId={IS_POPUP ? "main" : undefined}
    >
      {!!current && <DialogContent {...current} onDismiss={close} />}
    </Modal>
  )
}

const NftDialogWrapper: FC<{ nftId: string | null; onDismiss: () => void }> = ({
  nftId,
  onDismiss,
}) => {
  const nftData = useAtomValue(nftDataAtomFamily(nftId))
  return <NftDialogInner data={nftData} onDismiss={onDismiss} />
}

export const NftDialog: FC<{ nftId: string | null; onDismiss: () => void }> = (props) => (
  <Suspense fallback={<SuspenseTracker name="NftDialogWrapper" />}>
    <NftDialogWrapper {...props} />
  </Suspense>
)
