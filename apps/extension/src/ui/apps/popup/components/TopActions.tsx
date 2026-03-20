import { ArrowDownIcon, RepeatIcon, SendIcon, TaoIcon } from "@talismn/icons"
import { classNames, isNotNil } from "@talismn/util"
import { api } from "@ui/api"
import { type AnalyticsEventName, type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSwapTokensModal } from "@ui/domains/Swap/hooks/useSwapTokensModal"
import { useIsBittensorEnabled } from "@ui/domains/TaoDashboard/hooks/useIsBittensorEnabled"
import { useAccounts } from "@ui/state/accounts"
import { type FC, type MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

type TopActionsProps = {
  analyticsPage: AnalyticsPage
  disabled?: boolean
}

export const TopActions = ({ analyticsPage, disabled }: TopActionsProps) => {
  const { t } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { open: openSwapTokensModal } = useSwapTokensModal()
  const ownedAccounts = useAccounts("owned")
  const isBittensorEnabled = useIsBittensorEnabled()

  const { disableActions, disabledReason } = useMemo(() => {
    const disableActions = disabled || !ownedAccounts.length
    const disabledReason = disableActions ? t("Add an account to send or receive funds") : undefined
    return { disableActions, disabledReason }
  }, [disabled, ownedAccounts.length, t])

  const topActions = useMemo<ActionProps[]>(
    () =>
      [
        {
          analyticsPage,
          analyticsName: "Goto" as const,
          analyticsAction: "Send Funds button",
          label: t("Send"),
          icon: SendIcon,
          onClick: () => api.sendFundsOpen().then(() => window.close()),
          disabled: disableActions,
          disabledReason,
        },
        {
          analyticsPage,
          analyticsName: "Goto" as const,
          analyticsAction: "open receive",
          label: t("Receive"),
          icon: ArrowDownIcon,
          onClick: () => openCopyAddressModal(),
          disabled: disableActions,
          disabledReason,
        },
        {
          analyticsPage,
          analyticsName: "Goto" as const,
          analyticsAction: "open swap",
          label: t("Swap"),
          icon: RepeatIcon,
          onClick: () => openSwapTokensModal(),
          disabled: disableActions,
          disabledReason,
        },
        isBittensorEnabled
          ? {
              analyticsPage,
              analyticsName: "Goto" as const,
              analyticsAction: "open tao dashboard",
              label: t("Trade TAO"),
              icon: TaoIcon,
              onClick: () => api.dashboardOpen("/bittensor/subnets"),
              disabled: false,
            }
          : null,
      ].filter(isNotNil),
    [
      analyticsPage,
      disableActions,
      disabledReason,
      openCopyAddressModal,
      openSwapTokensModal,
      t,
      isBittensorEnabled,
    ]
  )

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex justify-center gap-4">
        {topActions.map((action, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <Action key={index} {...action} />
        ))}
      </div>
    </div>
  )
}

type ActionProps = {
  analyticsPage: AnalyticsPage
  analyticsName: AnalyticsEventName
  analyticsAction?: string
  label: string
  tooltip?: string
  icon: FC<{ className?: string }>
  onClick: () => void
  disabled: boolean
  disabledReason?: string
}

const Action: FC<ActionProps> = ({
  analyticsPage,
  analyticsName,
  analyticsAction,
  label,
  tooltip,
  icon: Icon,
  onClick,
  disabled,
  disabledReason,
}) => {
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation()
      sendAnalyticsEvent({
        ...analyticsPage,
        name: analyticsName,
        action: analyticsAction,
      })
      onClick()
    },
    [onClick, analyticsAction, analyticsName, analyticsPage]
  )

  return (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <button
          type="button"
          className={classNames(
            "pointer-events-auto flex h-10 items-center gap-2 rounded-full bg-white/5 px-3 text-[1rem] text-body-secondary opacity-90 backdrop-blur-sm",
            "enabled:hover:bg-white/10 enabled:hover:text-body"
          )}
          onClick={handleClick}
          disabled={disabled}
        >
          <div>
            <Icon className="size-6" />
          </div>
          <div>{label}</div>
        </button>
      </TooltipTrigger>
      {(!!disabledReason || !!tooltip) && (
        <TooltipContent>{disabledReason || tooltip}</TooltipContent>
      )}
    </Tooltip>
  )
}
