import {
  ArrowDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  PaperPlaneIcon,
} from "@talisman/theme/icons"
import { Balance, Balances } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsEventName, AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"
import { useSetting } from "@ui/hooks/useSettings"
import { ComponentProps, MouseEventHandler, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

type Props = {
  className?: string
  mouseOver: boolean
}

export const TotalFiatBalance = ({ className, mouseOver }: Props) => {
  const { t } = useTranslation()
  const { folder } = useSearchParamsSelectedFolder()

  const balances = useBalances(folder ? "all" : "portfolio")
  const balancesByAddress = useMemo(() => {
    // we use this to avoid looping over the balances list n times, where n is the number of accounts in the wallet
    // instead, we'll only interate over the balances one time
    const balancesByAddress: Map<string, Balance[]> = new Map()
    balances.each.forEach((balance) => {
      if (!balancesByAddress.has(balance.address)) balancesByAddress.set(balance.address, [])
      balancesByAddress.get(balance.address)?.push(balance)
    })
    return balancesByAddress
  }, [balances])
  const filteredBalances = useMemo(
    () =>
      !folder
        ? balances
        : new Balances(
            folder.tree.flatMap((account) => balancesByAddress.get(account.address) ?? [])
          ),
    [balances, balancesByAddress, folder]
  )

  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const { genericEvent } = useAnalytics()

  const toggleHideBalance: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation()
      genericEvent("toggle hide balance")
      setHideBalances((prev) => !prev)
    },
    [genericEvent, setHideBalances]
  )

  return (
    <div className={classNames(className, "flex w-full items-center")}>
      <div className="flex flex-grow flex-col items-start gap-4">
        <div className="text-body-secondary mt-2 flex gap-2 text-sm">
          <span>{folder ? folder.name : t("Total Portfolio")}</span>
          <button
            className={classNames(
              "hover:text-body focus:text-body opacity-0 transition-[color,opacity]",
              (hideBalances || mouseOver) && "opacity-100"
            )}
            onClick={toggleHideBalance}
          >
            {hideBalances ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        </div>
        <Fiat
          className="font-surtExpanded text-lg"
          amount={filteredBalances?.sum.fiat("usd").total}
          currency="usd"
          isBalance
        />
        <TopActions />
      </div>
      <ChevronRightIcon
        className={classNames("text-body-secondary text-lg", mouseOver && "!text-body")}
      />
    </div>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Porfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

const TopActions = () => {
  const { t } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const canBuy = useIsFeatureEnabled("BUY_CRYPTO")

  const topActions = useMemo(() => {
    const topActions: Array<{
      analyticsName: AnalyticsEventName
      analyticsAction?: string
      label: string
      icon: ComponentProps<typeof PillButton>["icon"]
      action: () => void
    }> = [
      {
        analyticsName: "Goto",
        analyticsAction: "open receive",
        label: t("Receive"),
        icon: ArrowDownIcon,
        action: () => openCopyAddressModal({ mode: "receive" }),
      },
      {
        analyticsName: "Goto",
        analyticsAction: "Send Funds button",
        label: t("Send"),
        icon: PaperPlaneIcon,
        action: () => api.sendFundsOpen().then(() => window.close()),
      },
    ]
    if (canBuy)
      topActions.push({
        analyticsName: "Goto",
        analyticsAction: "Buy Crypto button",
        label: t("Buy"),
        icon: CreditCardIcon,
        action: () => api.modalOpen({ modalType: "buy" }).then(() => window.close()),
      })
    return topActions
  }, [canBuy, openCopyAddressModal, t])

  const handleClicks = useMemo(
    () =>
      topActions.map(
        (topAction): MouseEventHandler<HTMLButtonElement> =>
          (event) => {
            event.stopPropagation()
            sendAnalyticsEvent({
              ...ANALYTICS_PAGE,
              name: topAction.analyticsName,
              action: topAction.analyticsAction,
            })
            topAction.action()
          }
      ),
    [topActions]
  )

  return (
    <div className="flex justify-center gap-4">
      {topActions.map((action, index) => (
        <PillButton
          key={index}
          className="bg-opacity-50"
          onClick={handleClicks[index]}
          icon={action.icon}
        >
          {action.label}
        </PillButton>
      ))}
    </div>
  )
}
