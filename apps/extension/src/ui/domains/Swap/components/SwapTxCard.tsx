import type { QuoteLeg } from "@core/domains/swaps/types"
import { networkIdFromTokenId, type TokenId } from "@talismn/chaindata-provider"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  LoaderIcon,
} from "@talismn/icons"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworksMapById, useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type FC, type ReactNode, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  activeSwapTxKey,
  type SwapTxCardKey,
  type SwapTxCardModel,
  type SwapTxContext,
  type SwapTxStatus,
} from "./swapTxCards"

export const useSwapTxContext = (): SwapTxContext => {
  const { t } = useTranslation()
  const accounts = useAccountsMap()
  const networks = useNetworksMapById()
  return useMemo(() => ({ t, accounts, networks }), [accounts, networks, t])
}

/** the card that becomes active opens and the others close, the user can still open any of them */
const useExpandedCards = (activeKey: SwapTxCardKey | null) => {
  const [expanded, setExpanded] = useState<ReadonlySet<SwapTxCardKey>>(
    () => new Set(activeKey ? [activeKey] : [])
  )
  const [expandedFor, setExpandedFor] = useState(activeKey)
  if (activeKey !== expandedFor) {
    setExpandedFor(activeKey)
    if (activeKey) setExpanded(new Set([activeKey]))
  }

  const toggle = useCallback(
    (key: SwapTxCardKey) =>
      setExpanded((current) => {
        const next = new Set(current)
        if (!next.delete(key)) next.add(key)
        return next
      }),
    []
  )

  return [expanded, toggle] as const
}

type BadgeTone = "idle" | "active" | "done"

const BADGE_TONE: Record<SwapTxStatus, BadgeTone> = {
  upcoming: "idle",
  ready: "active",
  signing: "active",
  pending: "active",
  done: "done",
  failed: "active",
  skipped: "idle",
  untracked: "idle",
}

const Badge: FC<{ number: number; status: SwapTxStatus }> = ({ number, status }) => {
  const tone = BADGE_TONE[status]
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-xs",
        tone === "idle" ? "bg-grey-700 text-body-secondary" : "bg-primary text-black"
      )}
    >
      {tone === "done" ? <CheckIcon className="text-sm" /> : number}
    </div>
  )
}

const PILL_TONE = {
  primary: "bg-primary/10 text-primary",
  orange: "bg-orange-500/10 text-orange-500",
  grey: "bg-grey-800 text-body-secondary",
}

const Pill: FC<{ tone: keyof typeof PILL_TONE; icon?: ReactNode; label: string }> = ({
  tone,
  icon,
  label,
}) => (
  <div
    className={cn(
      "flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xs px-3 text-tiny",
      PILL_TONE[tone]
    )}
  >
    {icon}
    {label}
  </div>
)

const StatusPill: FC<{ card: SwapTxCardModel }> = ({ card }) => {
  const { t } = useTranslation()

  switch (card.status) {
    case "upcoming":
    case "ready":
      return null
    case "signing":
      return (
        <Pill
          tone="primary"
          icon={<LoaderIcon className="animate-spin-slow" />}
          label={t("Submitting")}
        />
      )
    case "pending":
      return (
        <Pill
          tone="primary"
          icon={<LoaderIcon className="animate-spin-slow" />}
          label={t("Pending")}
        />
      )
    case "failed":
      return <Pill tone="orange" icon={<AlertCircleIcon />} label={t("Error")} />
    case "skipped":
      return <Pill tone="grey" label={t("Skipped")} />
    case "untracked":
      return <Pill tone="grey" label={t("Unknown")} />
    case "done":
      return card.href ? (
        <a href={card.href} target="_blank" rel="noopener" className="hover:opacity-80">
          <Pill tone="primary" icon={<ExternalLinkIcon />} label={t("Completed")} />
        </a>
      ) : (
        <Pill tone="primary" label={t("Completed")} />
      )
  }
}

const TokenChip: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const token = useToken(tokenId)
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="relative shrink-0">
        <TokenLogo tokenId={tokenId} className="size-10 rounded-full" />
        <NetworkLogo
          networkId={networkIdFromTokenId(tokenId)}
          className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 rounded-full border border-grey-900 text-[0.5rem]"
        />
      </span>
      <span className="truncate">{token?.symbol}</span>
    </span>
  )
}

const CardTitle: FC<{ card: SwapTxCardModel; leg: QuoteLeg }> = ({ card, leg }) => {
  const { t } = useTranslation()

  return card.kind === "approval" ? (
    <>
      <span className="shrink-0">{t("Approve")}</span>
      <TokenChip tokenId={leg.fromTokenId} />
    </>
  ) : (
    <>
      <TokenChip tokenId={leg.fromTokenId} />
      <ArrowRightIcon className="shrink-0 text-body-secondary" />
      <TokenChip tokenId={leg.toTokenId} />
    </>
  )
}

const SwapTxCard: FC<{
  card: SwapTxCardModel
  leg: QuoteLeg
  number: number
  isExpanded: boolean
  onToggle: (key: SwapTxCardKey) => void
  children: ReactNode
}> = ({ card, leg, number, isExpanded, onToggle, children }) => {
  const { t } = useTranslation()
  const toggle = () => onToggle(card.key)

  return (
    <section className="flex w-full flex-col gap-6 rounded bg-grey-900 py-8 pr-6 pl-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isExpanded}
          className="flex min-w-0 grow items-center gap-4 text-left font-bold text-body text-sm"
        >
          <Badge number={number} status={card.status} />
          <CardTitle card={card} leg={leg} />
        </button>
        <StatusPill card={card} />
        <button
          type="button"
          onClick={toggle}
          aria-label={isExpanded ? t("Collapse") : t("Expand")}
          className="shrink-0 text-body-secondary text-md hover:text-body"
        >
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </div>
      {isExpanded ? <div className="flex flex-col gap-4">{children}</div> : null}
      {card.error ? (
        <div role="alert" className="flex items-start gap-4 text-orange-500 text-xs">
          <AlertCircleIcon className="mt-px shrink-0 text-sm" />
          <div>{card.error}</div>
        </div>
      ) : null}
    </section>
  )
}

export const SwapTxCards: FC<{
  cards: readonly SwapTxCardModel[]
  legs: readonly QuoteLeg[]
  renderBody: (card: SwapTxCardModel) => ReactNode
}> = ({ cards, legs, renderBody }) => {
  const [expanded, toggle] = useExpandedCards(activeSwapTxKey(cards))

  return cards.map((card, index) => (
    <SwapTxCard
      key={card.key}
      card={card}
      leg={legs[card.leg]}
      number={index + 1}
      isExpanded={expanded.has(card.key)}
      onToggle={toggle}
    >
      {renderBody(card)}
    </SwapTxCard>
  ))
}

export const SwapTxRow: FC<{ label: ReactNode; children?: ReactNode }> = ({ label, children }) => (
  <div className="flex min-h-11 items-center justify-between gap-8 text-xs">
    <div className="whitespace-nowrap text-body-secondary">{label}</div>
    <div className="flex min-w-0 items-center justify-end gap-2 text-body">{children}</div>
  </div>
)

export const SwapTxLayout: FC<{ footer: ReactNode; children: ReactNode }> = ({
  footer,
  children,
}) => (
  <>
    <ScrollContainer
      className="w-full grow"
      innerClassName="flex flex-col items-center gap-6 px-12 pb-8 *:shrink-0"
    >
      {children}
    </ScrollContainer>
    <div className="w-full shrink-0 bg-black/40 px-12 py-8 pb-12">{footer}</div>
  </>
)
