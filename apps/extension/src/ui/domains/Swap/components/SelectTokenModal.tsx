import { Token } from "@talismn/chaindata-provider"
import { AlertTriangleIcon, ChevronLeftIcon } from "@talismn/icons"
import { UNKNOWN_TOKEN_URL } from "extension-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { FadeIn } from "@talisman/components/FadeIn"
import { TokenPicker } from "@ui/domains/Asset/TokenPicker"
import { useNetworkById, useRemoteConfig } from "@ui/state"

import { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import { getTokenTabs, safeTokensSetAtom, tokenTabAtom } from "../swaps.api"
import { SwapTokensFullscreenPortal } from "./SwapTokensFullscreenPortal"

type Props = {
  assets?: SwappableAssetWithDecimals[]
  selectedAsset?: SwappableAssetWithDecimals | null
  onSelectAsset: (asset: SwappableAssetWithDecimals | null) => void
  /** Used to determine which tokens should be prioritized to the top of the list */
  priorityMode?: "buy" | "sell"
}

export const SelectTokenModal: React.FC<Props> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  priorityMode,
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [assetWithWarning, setAssetWithWarning] = useState<SwappableAssetWithDecimals | null>(null)
  const safeList = useAtomValue(loadable(safeTokensSetAtom))

  const handleSelectAsset = useCallback(
    (asset: SwappableAssetWithDecimals, hideWarning?: boolean) => {
      if (!hideWarning) {
        const erc20Address = asset.contractAddress
        const isSafe =
          safeList.state === "hasData"
            ? safeList.data.has(`${asset.chainId}:${erc20Address?.toLowerCase()}`)
            : false
        const shouldShowWarning = !isSafe && erc20Address !== undefined
        if (shouldShowWarning) return setAssetWithWarning(asset)
      }

      setAssetWithWarning(null)
      onSelectAsset(asset)
      setOpen(false)
    },
    [onSelectAsset, safeList],
  )
  const assetIds = assets?.map((a) => a.id)
  const handleSelectAssetId = useCallback(
    (assetId: string | undefined) => {
      const asset = assets?.find((a) => a.id === assetId)
      if (!asset) return onSelectAsset(null)

      return handleSelectAsset(asset)
    },
    [assets, handleSelectAsset, onSelectAsset],
  )

  const remoteConfig = useRemoteConfig()
  const promotedTokens = useCallback(
    (token: Token) => {
      const promotedTokens =
        priorityMode === "buy"
          ? remoteConfig.swaps.promotedBuyTokens
          : priorityMode === "sell"
            ? remoteConfig.swaps.promotedSellTokens
            : undefined
      return promotedTokens?.includes(token.id) || false
    },
    [priorityMode, remoteConfig],
  )

  const { tokenFilterOptions, defaultTokenFilterOption, onSelectTokenFilterOption } =
    useTokenFilterOptions()

  const tokenFilter = useCallback(
    (token: Token) => assetIds?.includes(token.id) ?? false,
    [assetIds],
  )

  return (
    <>
      <OpenSelectorButton selectedAsset={selectedAsset} onClick={() => setOpen(true)} />

      {open && (
        <SwapTokensFullscreenPortal>
          <div className="absolute left-0 top-0 flex h-full w-full flex-col bg-black">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <button className="px-12 py-10" onClick={() => setOpen(false)}>
                  <ChevronLeftIcon className="text-body-secondary shrink-0 text-lg hover:text-white" />
                </button>
              </div>

              <h3 className="text-body-secondary text-base">{t("Select a token")}</h3>

              <div className="flex-1" />
            </div>

            <TokenPicker
              selected={selectedAsset?.id}
              allowUntransferable
              ownedOnly
              isInitializing={!assets}
              priorityTokens={promotedTokens}
              tokenFilter={tokenFilter}
              tokenFilterOptions={tokenFilterOptions}
              tokenFilterDefaultOption={defaultTokenFilterOption}
              onTokenFilterOptionChange={onSelectTokenFilterOption}
              onSelect={(tokenId) => handleSelectAssetId(tokenId)}
              showEmptyBalances
            />

            {assetWithWarning && (
              <FadeIn>
                <div className="absolute left-0 top-0 flex h-full w-full flex-col items-center justify-center bg-black/70">
                  {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                  <div
                    className="absolute left-0 top-0 h-full w-full"
                    onClick={() => setAssetWithWarning(null)}
                  />
                  <div className="bg-black-tertiary relative mx-auto flex w-[calc(100%-0.8rem)] flex-col items-center rounded px-4 py-8">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="w-max rounded bg-red-600/20 p-4 text-red-500">
                        <AlertTriangleIcon />
                      </div>
                      <p className="font-semibold text-white">{t("Warning")}</p>
                    </div>
                    <p className="text-grey-400 pb-8 text-sm">
                      <Trans t={t}>
                        <span className="text-white">
                          {assetWithWarning.name} (${assetWithWarning.symbol})
                        </span>{" "}
                        isn't traded on leading U.S. centralised exchanges or frequently swapped.
                        Always do your own research before proceeding.
                      </Trans>
                    </p>
                    <div className="border-grey-700 mb-6 flex w-full items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src="data:image/png;base64,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"
                          alt=""
                          className="h-12 w-auto"
                        />
                        <div>
                          <p className="mb-2 text-sm font-semibold !leading-none">
                            {t("Token Audit Report")}
                          </p>
                          <p className="text-muted-foreground text-xs !leading-none">
                            {t("Powered by GoPlus")}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://gopluslabs.io/token-security/${assetWithWarning.chainId}/${assetWithWarning.contractAddress}`}
                        target="_blank"
                      >
                        <button className="!h-max !rounded !px-6 !py-4 !text-sm">
                          {t("View Report")}
                        </button>
                      </a>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-4">
                      <Button className="w-full" onClick={() => setAssetWithWarning(null)}>
                        {t("Back")}
                      </Button>
                      <Button
                        onClick={() => handleSelectAsset(assetWithWarning, true)}
                        className="w-full"
                      >
                        {t("I understand")}
                      </Button>
                    </div>
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        </SwapTokensFullscreenPortal>
      )}
    </>
  )
}

const OpenSelectorButton = ({
  selectedAsset,
  onClick,
}: {
  selectedAsset?: SwappableAssetWithDecimals | null
  onClick: () => void
}) => {
  const { t } = useTranslation()

  const selectedAssetChain = useNetworkById(selectedAsset?.chainId.toString())

  return (
    <button
      className="text-body-secondary hover:bg-grey-700 bg-grey-750 flex h-20 items-center gap-4 rounded px-4 py-2 text-sm transition-opacity"
      onClick={onClick}
    >
      {selectedAsset && (
        <img
          key={selectedAsset?.image ?? UNKNOWN_TOKEN_URL}
          src={selectedAsset?.image ?? UNKNOWN_TOKEN_URL}
          alt=""
          className="h-12 w-12 min-w-12 rounded-full"
        />
      )}
      {selectedAsset && (
        <div className="text-left">
          <p className="text-body mb-1 text-sm leading-none">{selectedAsset.symbol}</p>
          <p className="text-tiny text-grey-400 max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap leading-none">
            {selectedAssetChain?.name}
          </p>
        </div>
      )}

      {!selectedAsset && (
        <p className="text-grey-400 whitespace-nowrap text-xs">{t("Select Token")}</p>
      )}
    </button>
  )
}

const useTokenFilterOptions = () => {
  const { t } = useTranslation()

  const tokenFilterOptions = getTokenTabs({ t }).map((tab): [string, string] => [
    tab.value,
    tab.label,
  ])

  const defaultTokenFilterOption = useAtomValue(tokenTabAtom)
  const onSelectTokenFilterOption = useSetAtom(tokenTabAtom)

  return { tokenFilterOptions, defaultTokenFilterOption, onSelectTokenFilterOption }
}
