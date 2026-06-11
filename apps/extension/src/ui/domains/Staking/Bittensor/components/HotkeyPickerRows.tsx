import { TAO_DECIMALS } from "@talismn/balances"
import type { DotNetworkId, TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import {
  CheckCircleIcon,
  HomeIcon,
  LockIcon,
  ShieldIcon,
  TargetIcon,
  ToolIcon,
  ZapIcon,
} from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useScrollContainer } from "@ui/components/ScrollContainer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { EarnTypeBadge } from "@ui/domains/Earn/components/EarnTypeBadge"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC, SVGProps } from "react"
import { useTranslation } from "react-i18next"

import { useBittensorHotkeyConviction } from "../hooks/useBittensorHotkeyConviction"
import type { NeuronRole, SubnetNeuron } from "../hooks/useBittensorSubnetNeurons"

const ROLE_BADGE: Record<NeuronRole, { Icon: FC<SVGProps<SVGSVGElement>>; className: string }> = {
  owner: { Icon: HomeIcon, className: "bg-primary/10 text-primary" },
  validator: { Icon: ZapIcon, className: "bg-grey-800 text-body-secondary" },
  miner: { Icon: ToolIcon, className: "bg-grey-800 text-body-secondary" },
}

/**
 * Whether moving an existing conviction lock to this hotkey keeps its conviction:
 * - `full`: the subnet-owner hotkey (chain grants instant full conviction)
 * - `keeps`: same owning coldkey as the current lock (conviction carries over)
 * Different-owner hotkeys (which would reset conviction) get no badge — the reset is warned on the
 * form and confirm steps, and most candidates are different-owner, so a badge there would be noise.
 */
export type ConvictionKeeperKind = "keeps" | "full"

/** Green chip flagging a hotkey that preserves (or maxes out) the lock's conviction on a move. */
export const ConvictionKeeperBadge: FC<{ kind: ConvictionKeeperKind }> = ({ kind }) => {
  const { t } = useTranslation()
  const isFull = kind === "full"
  const Icon = isFull ? ShieldIcon : CheckCircleIcon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <EarnTypeBadge className="inline-flex h-[18px] shrink-0 items-center gap-[4px] rounded-[12px] border-none bg-primary/10 px-[8px] font-light text-[10px] text-primary normal-case">
            <Icon className="size-[12px]" />
            {isFull ? t("Full conviction") : t("Keeps conviction")}
          </EarnTypeBadge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {isFull
          ? t("Subnet owner — moving the lock here grants instant full conviction.")
          : t("Same owner as your current lock — your accumulated conviction carries over.")}
      </TooltipContent>
    </Tooltip>
  )
}

/** Resolves the conviction-keeper badge kind for a neuron, given the current lock's owning coldkey. */
export const getConvictionKeeperKind = (
  neuron: Pick<SubnetNeuron, "role" | "coldkey">,
  lockOriginColdkey: string | null | undefined
): ConvictionKeeperKind | null => {
  if (!lockOriginColdkey) return null
  if (neuron.role === "owner") return "full"
  if (neuron.coldkey && isAddressEqual(neuron.coldkey, lockOriginColdkey)) return "keeps"
  return null
}

export const HotkeyRows: FC<{
  networkId: DotNetworkId
  netuid: number
  tokenId: TokenId
  symbol: string
  neurons: SubnetNeuron[]
  selectedHotkey?: string | null
  onSelect: (hotkey: string) => void
  /** when set (change-hotkey flow), rows that keep the lock's conviction get a badge */
  lockOriginColdkey?: string | null
}> = ({
  networkId,
  netuid,
  tokenId,
  symbol,
  neurons,
  selectedHotkey,
  onSelect,
  lockOriginColdkey,
}) => {
  const { ref: refContainer } = useScrollContainer()

  const virtualizer = useVirtualizer({
    count: neurons.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!neurons.length) return null

  return (
    <div>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const neuron = neurons[item.index]
          if (!neuron) return null

          return (
            <div
              key={item.key}
              className="absolute top-0 left-0 w-full"
              style={{ height: `${item.size}px`, transform: `translateY(${item.start}px)` }}
              data-testid="hotkey-picker-row"
            >
              <HotkeyRow
                neuron={neuron}
                networkId={networkId}
                netuid={netuid}
                tokenId={tokenId}
                symbol={symbol}
                isSelected={!!selectedHotkey && isAddressEqual(neuron.hotkey, selectedHotkey)}
                keeperKind={getConvictionKeeperKind(neuron, lockOriginColdkey)}
                onClick={() => onSelect(neuron.hotkey)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const HotkeyRowSkeleton = () => {
  return (
    <div className="flex h-14.5 w-full shrink-0 items-center gap-6 px-12 pl-8 text-left">
      <div className="size-16 animate-pulse rounded-full bg-grey-750" />
      <div className="grow space-y-[5px]">
        <div className="flex w-full justify-between font-bold text-body text-sm">
          <div className="inline-block h-7 w-56 animate-pulse rounded-xs bg-grey-750" />
          <div className="inline-block h-7 w-20 animate-pulse rounded-xs bg-grey-750" />
        </div>
        <div className="flex w-full items-center gap-2 font-light text-body-secondary text-xs">
          <div className="inline-block h-6 w-40 animate-pulse rounded-xs bg-grey-800" />
        </div>
      </div>
    </div>
  )
}

const HotkeyRow: FC<{
  neuron: SubnetNeuron
  networkId: DotNetworkId
  netuid: number
  tokenId: TokenId
  symbol: string
  isSelected?: boolean
  keeperKind?: ConvictionKeeperKind | null
  onClick: () => void
}> = ({ neuron, networkId, netuid, tokenId, symbol, isSelected, keeperKind, onClick }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId, "substrate-dtao")
  const decimals = Number(token?.decimals ?? TAO_DECIMALS)
  const { conviction } = useBittensorHotkeyConviction(networkId, netuid, neuron.hotkey)

  const { Icon: RoleIcon, className: roleClassName } = ROLE_BADGE[neuron.role]
  const roleLabel =
    neuron.role === "owner" ? t("Owner") : neuron.role === "validator" ? t("Validator") : t("Miner")

  const badge = (
    <EarnTypeBadge
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center gap-[4px] rounded-[12px] border-none px-[8px] font-light text-[10px] normal-case",
        roleClassName
      )}
    >
      <RoleIcon className="size-[12px]" />
      {roleLabel}
    </EarnTypeBadge>
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14.5 w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left hover:bg-grey-750 focus:bg-grey-700",
        isSelected && "bg-grey-800 text-body-secondary"
      )}
    >
      <AccountIcon address={neuron.hotkey} className="size-16 shrink-0 text-xl" />
      <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
        <div className="flex w-full items-center justify-between gap-8 text-body text-sm">
          <div className="min-w-0">
            {neuron.name ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="truncate">{neuron.name}</div>
                </TooltipTrigger>
                <TooltipContent>{neuron.hotkey}</TooltipContent>
              </Tooltip>
            ) : (
              <Address startCharCount={8} endCharCount={8} address={neuron.hotkey} />
            )}
          </div>
          {neuron.role === "owner" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0">{badge}</span>
              </TooltipTrigger>
              <TooltipContent>
                {t("Locking to the subnet owner grants instant full conviction.")}
              </TooltipContent>
            </Tooltip>
          ) : (
            badge
          )}
        </div>
        <div className="flex w-full items-center gap-4 text-body-secondary text-xs">
          <div className="flex min-w-0 grow items-center gap-4 overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex shrink-0 items-center gap-2">
                  <LockIcon />
                  <Tokens
                    amount={planckToTokens(neuron.stakeOnSubnet.toString(), decimals)}
                    symbol={symbol}
                    noCountUp
                    noTooltip
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>{t("Stake on this subnet")}</TooltipContent>
            </Tooltip>
            {conviction != null && conviction > 0n && (
              <>
                <div className="inline-block size-2 shrink-0 rounded-full bg-body-disabled" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex shrink-0 items-center gap-2">
                      <TargetIcon />
                      <Tokens
                        amount={planckToTokens(conviction.toString(), decimals)}
                        symbol={symbol}
                        noCountUp
                        noTooltip
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("Total conviction locked to this hotkey across all wallets")}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
          {keeperKind && <ConvictionKeeperBadge kind={keeperKind} />}
        </div>
      </div>
    </button>
  )
}
