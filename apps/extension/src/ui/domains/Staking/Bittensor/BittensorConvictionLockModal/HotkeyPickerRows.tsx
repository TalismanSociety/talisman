import { TAO_DECIMALS } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { LockIcon, StarIcon, ToolIcon, UserIcon, ZapIcon } from "@talismn/icons"
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

import type { NeuronRole, SubnetNeuron } from "../hooks/useBittensorSubnetNeurons"

const ROLE_BADGE: Record<NeuronRole, { Icon: FC<SVGProps<SVGSVGElement>>; className: string }> = {
  owner: { Icon: ZapIcon, className: "bg-primary/10 text-primary" },
  validator: { Icon: StarIcon, className: "bg-grey-800 text-body-secondary" },
  miner: { Icon: ToolIcon, className: "bg-grey-800 text-body-disabled" },
}

export const HotkeyRows: FC<{
  tokenId: TokenId
  symbol: string
  neurons: SubnetNeuron[]
  selectedHotkey?: string | null
  onSelect: (hotkey: string) => void
}> = ({ tokenId, symbol, neurons, selectedHotkey, onSelect }) => {
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
              data-testid="token-picker-row"
            >
              <HotkeyRow
                neuron={neuron}
                tokenId={tokenId}
                symbol={symbol}
                isSelected={neuron.hotkey === selectedHotkey}
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

export const HotkeyRow: FC<{
  neuron: SubnetNeuron
  tokenId: TokenId
  symbol: string
  isSelected?: boolean
  onClick: () => void
}> = ({ neuron, tokenId, symbol, isSelected, onClick }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId, "substrate-dtao")
  const decimals = Number(token?.decimals ?? TAO_DECIMALS)

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
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent>
                {t("Locking to the subnet owner grants instant full conviction.")}
              </TooltipContent>
            </Tooltip>
          ) : (
            badge
          )}
        </div>
        <div className="flex w-full items-center gap-4 text-body-secondary text-xs">
          <div className="shrink-0">{t("UID {{uid}}", { uid: neuron.uid })}</div>
          <div className="inline-block size-2 shrink-0 rounded-full bg-body-disabled" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
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
          {neuron.isYouStakeHere && (
            <>
              <div className="inline-block size-2 shrink-0 rounded-full bg-body-disabled" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-primary">
                    <UserIcon />
                    {t("You stake here")}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t("You have stake on this hotkey.")}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
