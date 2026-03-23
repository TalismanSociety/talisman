import type { Token, TokenId } from "@talismn/chaindata-provider"
import { AlertTriangleIcon, ChevronDownIcon, PlusIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { Modal } from "@ui/components/Modal"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokenPicker } from "@ui/domains/Asset/TokenPicker"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useNetworkById, useToken, useTokensMap } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { cn } from "@ui/util/cn"
import { type FC, memo, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { filterAndSortTokensByTab, getTokenTabs } from "../swap-services/token-filtering"
import { useRecentTokenIds } from "../swap-services/useRecentTokenIds"

const PICKER_CONTAINER_ID = "swap-modal-token-picker"

type Props = {
  allowedTokenIds: string[] | undefined // todo rename, these are tokenIds
  selectedTokenId?: string | null
  onSelectTokenId: (tokenId: string) => void
  /** Used to determine which tokens should be prioritized to the top of the list */
  priorityMode?: "buy" | "sell"
}

export const SelectTokenButton: React.FC<Props> = memo(
  ({ allowedTokenIds, selectedTokenId, onSelectTokenId, priorityMode }) => {
    const { open, close, isOpen } = useOpenClose()

    const handleSelect = useCallback(
      (tokenId: TokenId) => {
        onSelectTokenId(tokenId)
        close()
      },
      [onSelectTokenId, close]
    )

    return (
      <>
        <OpenSelectorButton selectedTokenId={selectedTokenId} onClick={open} />
        <TokenPickerModal
          isOpen={isOpen}
          tokenId={selectedTokenId ?? null}
          allowedTokenIds={allowedTokenIds}
          priorityMode={priorityMode}
          onSelect={handleSelect}
          onDismiss={close}
        />
      </>
    )
  }
)

const TokenPickerModal: FC<{
  isOpen: boolean
  tokenId: TokenId | null
  allowedTokenIds: string[] | undefined
  priorityMode?: "buy" | "sell"
  onSelect: (tokenId: TokenId) => void
  onDismiss: () => void
}> = ({ isOpen, ...contentProps }) => {
  return (
    <Modal containerId="swap-modal" isOpen={isOpen} onDismiss={contentProps.onDismiss}>
      <TokenPickerModalContent {...contentProps} />
    </Modal>
  )
}

const TokenPickerModalContent: FC<{
  tokenId: TokenId | null
  allowedTokenIds: string[] | undefined
  priorityMode?: "buy" | "sell"
  onSelect: (tokenId: TokenId) => void
  onDismiss: () => void
}> = ({ tokenId, allowedTokenIds, priorityMode, onSelect, onDismiss }) => {
  const { t } = useTranslation()
  const remoteConfig = useRemoteConfig()

  const [warningTokenId, setWarningTokenId] = useState<string | null>(null)
  const { safeTokens, acknowledgedTokenIds, acknowledgeToken } = useSwap()
  const tokensMap = useTokensMap()

  const priorityTokens = useCallback(
    (token: Token) => {
      const promotedTokens =
        priorityMode === "buy"
          ? remoteConfig.swaps.promotedBuyTokens
          : priorityMode === "sell"
            ? remoteConfig.swaps.promotedSellTokens
            : undefined
      return promotedTokens?.includes(token.id) || false
    },
    [priorityMode, remoteConfig]
  )

  const { tokenFilterOptions, defaultTokenFilterOption, onSelectTokenFilterOption, filterByTab } =
    useTokenFilterOptions()

  const filteredTokenIds = useMemo(
    () => filterByTab(allowedTokenIds),
    [filterByTab, allowedTokenIds]
  )

  const handleSelectTokenId = useCallback(
    (tokenId: string, acceptWarning?: boolean) => {
      if (!acceptWarning && !acknowledgedTokenIds.has(tokenId)) {
        const token = tokensMap[tokenId]
        const erc20Address =
          token && "contractAddress" in token ? (token.contractAddress as string) : undefined
        const networkId = token?.networkId
        const isSafe = safeTokens.has(`${networkId}:${erc20Address?.toLowerCase()}`)
        const shouldShowWarning = !isSafe && erc20Address !== undefined
        if (shouldShowWarning) return setWarningTokenId(tokenId)
      }

      if (acceptWarning) {
        acknowledgeToken(tokenId)
        setWarningTokenId(null)
      }
      onSelect(tokenId)
    },
    [safeTokens, tokensMap, onSelect, acknowledgedTokenIds, acknowledgeToken]
  )

  const assetIdSet = useMemo(() => new Set(filteredTokenIds), [filteredTokenIds])
  const tokenFilter = useCallback((token: Token) => assetIdSet.has(token.id), [assetIdSet])

  return (
    <WizardModalDialog
      className="border-none"
      contentClassName="p-0! relative"
      title={t("Select a token")}
      onBackClick={onDismiss}
      id={PICKER_CONTAINER_ID}
    >
      <TokenPicker
        selected={tokenId ?? undefined}
        allowUntransferable
        ownedOnly
        isInitializing={!allowedTokenIds}
        networkFilterContainerId={PICKER_CONTAINER_ID}
        priorityTokens={priorityTokens}
        tokenFilter={tokenFilter}
        tokenFilterOptions={tokenFilterOptions}
        tokenFilterDefaultOption={defaultTokenFilterOption}
        onTokenFilterOptionChange={onSelectTokenFilterOption}
        onSelect={handleSelectTokenId}
        showEmptyBalances
      />
      <SelectTokenWarningDrawer
        tokenId={warningTokenId}
        onBack={() => setWarningTokenId(null)}
        onAccept={() => handleSelectTokenId(warningTokenId!, true)}
      />
    </WizardModalDialog>
  )
}

const OpenSelectorButton = ({
  selectedTokenId,
  onClick,
}: {
  selectedTokenId?: string | null
  onClick: () => void
}) => {
  const { t } = useTranslation()
  const token = useToken(selectedTokenId ?? undefined)
  const network = useNetworkById(token?.networkId)

  if (!token) {
    return (
      <BaseButton
        className="group overflow-hidden text-body-secondary text-sm hover:border-primary/20 hover:bg-primary/5 hover:text-body"
        onClick={onClick}
      >
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-transparent bg-grey-800 text-primary group-hover:border-primary/20">
          <PlusIcon className="size-9" />
        </div>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="truncate">{t("Select Token")}</div>
          <ChevronDownIcon className="shrink-0" />
        </div>
      </BaseButton>
    )
  }

  return (
    <BaseButton onClick={onClick}>
      <div className="relative h-[32px] w-[32px] shrink-0">
        <TokenLogo tokenId={token.id} className="size-16" />
        <NetworkLogo
          networkId={token.networkId} // TODO remove cast once we have a correctly typed networkId
          className="absolute -right-[2px] -bottom-[2px] h-[14px] w-[14px] rounded-full border-[1.5px] border-grey-900"
        />
      </div>
      <div className="flex flex-col items-start gap-1 overflow-hidden">
        <div className="w-full truncate text-left text-body text-sm">{token.symbol}</div>
        <div className="w-full truncate text-left text-body-secondary text-xs">{network?.name}</div>
      </div>
      <ChevronDownIcon className="shrink-0" />
    </BaseButton>
  )
}

const BaseButton: FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button
    type="button"
    aria-haspopup="dialog"
    className={cn(
      "flex h-[44px] max-w-full items-center gap-4 overflow-hidden rounded-full border border-transparent px-2 text-body-secondary hover:bg-grey-750",
      className
    )}
    {...props}
  />
)

const useTokenFilterOptions = () => {
  const { t } = useTranslation()
  const remoteConfig = useRemoteConfig()
  const recentTokenIds = useRecentTokenIds()

  const { curatedTokens = [] } = remoteConfig.swaps
  const tabs = useMemo(
    () => getTokenTabs({ t, curatedTokens, recentTokenIds }),
    [t, curatedTokens, recentTokenIds]
  )

  const tokenFilterOptions = useMemo(
    () => tabs.map((tab): [string, string] => [tab.value, tab.label]),
    [tabs]
  )

  const [tokenTab, setTokenTab] = useState("all")

  // Reset to "all" if the currently selected tab is no longer visible
  useEffect(() => {
    if (!tabs.some((tab) => tab.value === tokenTab)) {
      setTokenTab("all")
    }
  }, [tabs, tokenTab])

  const filterByTab = useCallback(
    (tokenIds: string[] | undefined) => {
      if (!tokenIds) return undefined
      return filterAndSortTokensByTab(tokenIds, tokenTab, tabs)
    },
    [tokenTab, tabs]
  )

  return {
    tokenFilterOptions,
    defaultTokenFilterOption: tokenTab,
    onSelectTokenFilterOption: setTokenTab,
    filterByTab,
  }
}

const SelectTokenWarningDrawer: FC<{
  tokenId: string | null
  onBack: () => void
  onAccept: (tokenId: string) => void
}> = ({ tokenId, onBack, onAccept }) => {
  const { t } = useTranslation()

  // keep something to display while drawer closes
  const [safeTokenId, setSafeTokenId] = useState<string | null>(tokenId)
  const token = useToken(safeTokenId ?? undefined)

  useEffect(() => {
    if (tokenId) setSafeTokenId(tokenId)
  }, [tokenId])

  const contractAddress =
    token && "contractAddress" in token ? (token.contractAddress as string) : undefined

  return (
    <Drawer
      anchor="bottom"
      isOpen={!!tokenId}
      onDismiss={onBack}
      containerId={PICKER_CONTAINER_ID}
      // make it appear above the modal's picker
      // overlayClassName="z-20"
      // className="z-20"
    >
      {safeTokenId && token && (
        <div className="flex flex-col items-center gap-12 rounded-t-xl bg-grey-800 p-12">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <AlertTriangleIcon className="text-alert-warn text-md" />
              <p className="font-light text-alert-warn text-md">{t("Warning")}</p>
            </div>
            <p className="font-light text-alert-warn text-sm leading-paragraph">
              {token.symbol} (${token.symbol}){" "}
              {t(
                "isn't traded on leading U.S. centralised exchanges or frequently swapped. Always do your own research before proceeding."
              )}
            </p>
            <div className="flex h-28 w-full items-center gap-4 rounded-lg border border-grey-700 px-6">
              <img
                src="data:image/png;base64,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"
                alt=""
                className="h-16 w-auto shrink-0"
              />
              <div className="flex flex-col gap-3">
                <p className="text-body text-sm leading-none!">{t("Token Audit Report")}</p>
                <p className="text-body-secondary text-xs leading-none!">
                  {t("Powered by GoPlus")}
                </p>
              </div>
              <div className="grow"></div>
              <a
                href={`https://gopluslabs.io/token-security/${token.networkId}/${contractAddress}`}
                target="_blank"
                className="flex h-14 items-center rounded-full bg-primary-500/10 px-6 text-primary-500/80 text-sm hover:bg-primary-500/20 hover:text-primary"
              >
                <span>{t("View Report")}</span>
              </a>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-8">
            <Button onClick={onBack}>{t("Back")}</Button>
            <Button primary onClick={() => onAccept(safeTokenId)}>
              {t("I Understand")}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
