import { TALISMAN_WEB_APP_STAKING_URL } from "@core/constants"
import { Balances } from "@core/domains/balances/types"
import { isStakingSupportedChain } from "@core/domains/staking/helpers"
import { ExternalLinkIcon, XIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useStakingBanner } from "../../Staking/context"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"

export const AssetRowStakingReminderWrapper = ({
  balances,
  render,
}: {
  balances: Balances
  render: (showStakingReminder: boolean) => React.ReactNode
}) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { token, summary } = useTokenBalancesSummary(balances)

  const { showTokenStakingBanner, dismissStakingBanner, getStakingMessage, getBannerColours } =
    useStakingBanner()
  const showBanner = showTokenStakingBanner({
    token,
    addresses: Array.from(new Set(balances.each.map((b) => b.address))),
  })
  const message = getStakingMessage({ token })
  const colours = getBannerColours({ token })

  const handleClickStakingBanner = useCallback(() => {
    window.open(TALISMAN_WEB_APP_STAKING_URL)
    genericEvent("open web app staking from banner", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, token?.symbol])

  const handleDismissStakingBanner = useCallback(() => {
    const unsafeChainId = token?.chain?.id || token?.evmNetwork?.id
    if (unsafeChainId && isStakingSupportedChain(unsafeChainId)) dismissStakingBanner(unsafeChainId)
    genericEvent("dismiss staking banner", { from: "dashboard", symbol: token?.symbol })
  }, [token?.chain?.id, token?.evmNetwork?.id, token?.symbol, dismissStakingBanner, genericEvent])

  if (!token || !summary) return null

  return (
    <>
      {showBanner && (
        <div
          className={classNames(
            colours?.["text"],
            colours?.["background"],
            `flex h-[4.1rem] w-full cursor-pointer items-center justify-between rounded-t bg-gradient-to-b px-8 text-sm`
          )}
        >
          <button
            type="button"
            className="flex items-center gap-4"
            onClick={handleClickStakingBanner}
          >
            <ZapIcon className="shrink-0" />{" "}
            <div className="text-left">
              <Trans
                t={t}
                components={{
                  Highlight: <span className="text-white" />,
                  LinkIcon: (
                    <span className="inline-flex shrink-0 flex-col justify-center">
                      <ExternalLinkIcon className="inline-block shrink-0" />
                    </span>
                  ),
                }}
                defaults="<Highlight>Earn yield on your {{symbol}}.</Highlight> {{message}} <LinkIcon />"
                values={{ symbol: token.symbol, message }}
              />
            </div>
          </button>
          <button type="button" className="shrink-0">
            <XIcon onClick={handleDismissStakingBanner} />
          </button>
        </div>
      )}
      {render(showBanner)}
    </>
  )
}
