import { isTokenInTypes, type Token, type TokenId } from "@talismn/chaindata-provider"
import { AlertTriangleIcon, ChevronDownIcon, LoaderIcon, PlusIcon } from "@talismn/icons"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { Modal } from "@ui/components/Modal"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokenPicker, type TokenPickerScope } from "@ui/domains/Asset/TokenPicker"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { TokenRiskDrawer } from "@ui/domains/TokenRisk/TokenRiskDrawer"
import {
  getTokenRiskRef,
  type TokenRiskScan,
  tokenRiskScanQueryOptions,
  UNKNOWN_TOKEN_RISK,
} from "@ui/domains/TokenRisk/tokenRiskScan"
import { useIsTokenRiskScanEnabled } from "@ui/domains/TokenRisk/useTokenRiskScan"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useNetworkById, useToken, useTokensMap } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { cn } from "@ui/util/cn"
import { type FC, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { filterAndSortTokensByTab, getTokenTabs } from "../swap-services/token-filtering"
import { useRecentTokenIds } from "../swap-services/useRecentTokenIds"

const PICKER_CONTAINER_ID = "swap-modal-token-picker"
const RISK_SCAN_TIMEOUT_MS = 4000

type Props = {
  allowedTokenIds: string[] | undefined // todo rename, these are tokenIds
  selectedTokenId?: string | null
  onSelectTokenId: (tokenId: string) => void
  /** Used to determine which tokens should be prioritized to the top of the list */
  priorityMode?: "buy" | "sell"
  tokenScope?: TokenPickerScope
}

export const SelectTokenButton: React.FC<Props> = memo(
  ({ allowedTokenIds, selectedTokenId, onSelectTokenId, priorityMode, tokenScope }) => {
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
          tokenScope={tokenScope}
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
  tokenScope?: TokenPickerScope
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
  tokenScope?: TokenPickerScope
  onSelect: (tokenId: TokenId) => void
  onDismiss: () => void
}> = ({ tokenId, allowedTokenIds, priorityMode, tokenScope, onSelect, onDismiss }) => {
  const { t } = useTranslation()
  const remoteConfig = useRemoteConfig()

  const [warningTokenId, setWarningTokenId] = useState<string | null>(null)
  const [riskWarning, setRiskWarning] = useState<{ tokenId: string; scan: TokenRiskScan } | null>(
    null
  )
  const [scanningTokenId, setScanningTokenId] = useState<string | null>(null)
  const { safeTokens, acknowledgedTokenIds, acknowledgeToken } = useSwap()
  const tokensMap = useTokensMap()
  const { scanToken } = useSwapTokenRiskScan()
  const selectionRef = useRef<string | null>(null)

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

  const assetIdSet = useMemo(() => new Set(filteredTokenIds), [filteredTokenIds])

  // Also show any EVM ERC-20 or Solana SPL/Token2022 token so users can attempt
  // LI.FI routes for tokens not in the default list (e.g. RWAs).
  const tokenFilter = useCallback(
    (token: Token) =>
      assetIdSet.has(token.id) || isTokenInTypes(token, ["evm-erc20", "sol-spl", "sol-token2022"]),
    [assetIdSet]
  )

  const showSafeListWarningIfNeeded = useCallback(
    (tokenId: string) => {
      const token = tokensMap[tokenId]
      const erc20Address =
        token && "contractAddress" in token ? (token.contractAddress as string) : undefined
      const isSafe = safeTokens.has(`${token?.networkId}:${erc20Address?.toLowerCase()}`)
      if (!isSafe && erc20Address !== undefined) {
        setWarningTokenId(tokenId)
        return true
      }
      return false
    },
    [safeTokens, tokensMap]
  )

  const handleSelectTokenId = useCallback(
    async (tokenId: string, acceptWarning?: boolean) => {
      if (acceptWarning) {
        acknowledgeToken(tokenId)
        setWarningTokenId(null)
        setRiskWarning(null)
        return onSelect(tokenId)
      }
      if (acknowledgedTokenIds.has(tokenId)) return onSelect(tokenId)
      if (selectionRef.current) return

      const token = tokensMap[tokenId]
      selectionRef.current = tokenId
      setScanningTokenId(tokenId)
      const scan = await scanToken(token)
      selectionRef.current = null
      setScanningTokenId(null)

      if (scan.verdict === "Benign") return onSelect(tokenId)
      if (scan.verdict !== "unknown") return setRiskWarning({ tokenId, scan })
      if (!showSafeListWarningIfNeeded(tokenId)) onSelect(tokenId)
    },
    [
      tokensMap,
      onSelect,
      acknowledgedTokenIds,
      acknowledgeToken,
      scanToken,
      showSafeListWarningIfNeeded,
    ]
  )

  const riskWarningToken = useToken(riskWarning?.tokenId)

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
        tokenScope={tokenScope}
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
      {scanningTokenId && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <LoaderIcon className="animate-spin-slow text-xl" />
        </div>
      )}
      <SelectTokenWarningDrawer
        tokenId={warningTokenId}
        onBack={() => setWarningTokenId(null)}
        onAccept={() => handleSelectTokenId(warningTokenId!, true)}
      />
      <TokenRiskDrawer
        scan={riskWarning?.scan ?? null}
        symbol={riskWarningToken?.symbol}
        isOpen={!!riskWarning}
        containerId={PICKER_CONTAINER_ID}
        requireAcknowledgement={priorityMode !== "sell"}
        onDismiss={() => setRiskWarning(null)}
        onAccept={() => handleSelectTokenId(riskWarning!.tokenId, true)}
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
      <div className="relative size-16 shrink-0">
        <TokenLogo tokenId={token.id} className="size-16" />
        <NetworkLogo
          networkId={token.networkId} // TODO remove cast once we have a correctly typed networkId
          className="absolute -right-1 -bottom-1 size-7 rounded-full border-[1.5px] border-grey-900"
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

const useSwapTokenRiskScan = () => {
  const queryClient = useQueryClient()
  const isEnabled = useIsTokenRiskScanEnabled()
  const { genericEvent } = useAnalytics()

  const scanToken = useCallback(
    async (token: Token | undefined): Promise<TokenRiskScan> => {
      const ref = isEnabled ? getTokenRiskRef(token) : null
      if (!ref) return UNKNOWN_TOKEN_RISK
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<TokenRiskScan>((resolve) => {
        timer = setTimeout(() => resolve(UNKNOWN_TOKEN_RISK), RISK_SCAN_TIMEOUT_MS)
      })
      const scan = await Promise.race([
        queryClient.fetchQuery(tokenRiskScanQueryOptions(ref)).catch(() => UNKNOWN_TOKEN_RISK),
        timeout,
      ]).finally(() => clearTimeout(timer))
      genericEvent("token risk scan", {
        surface: "swap-select",
        verdict: scan.verdict,
        chain: ref.chain,
      })
      return scan
    },
    [isEnabled, queryClient, genericEvent]
  )

  return { scanToken }
}

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
