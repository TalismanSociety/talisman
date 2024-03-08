import { TALISMAN_WEB_APP_STAKING_URL } from "@extension/shared"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ExternalLinkIcon, XIcon, ZapIcon } from "@talismn/icons"
import { useStakingBanner } from "@ui/domains/Staking/useStakingBanner"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { MouseEventHandler, Suspense, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

export const StakingBannerInner = ({ addresses }: { addresses: string[] }) => {
  const { showStakingBanner, dismissStakingBanner } = useStakingBanner()
  const { genericEvent } = useAnalytics()
  const { t } = useTranslation()

  const showNomPoolStakingBanner = useMemo(
    () => showStakingBanner({ addresses }),
    [addresses, showStakingBanner]
  )

  const handleClickStakingBanner = useCallback(() => {
    window.open(TALISMAN_WEB_APP_STAKING_URL)
    genericEvent("open web app staking from banner", { from: "popup" })
  }, [genericEvent])

  const handleDismissStakingBanner: MouseEventHandler<SVGSVGElement> = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      dismissStakingBanner()
      genericEvent("dismiss staking banner", { from: "popup" })
    },
    [genericEvent, dismissStakingBanner]
  )

  return (
    <>
      {showNomPoolStakingBanner && (
        <button
          type="button"
          onClick={handleClickStakingBanner}
          className="staking-banner bg-primary-500 text-primary-500 flex h-28 w-full items-center justify-between rounded-sm bg-opacity-10 p-[1rem]"
        >
          <div className="flex gap-2">
            <div className="self-center">
              <ZapIcon className="h-[2.6rem] w-[2.6rem]" />
            </div>
            <div className="flex flex-col justify-start gap-[0.2rem] text-start text-sm text-white">
              <span className="font-bold">{t("Earn Staking Rewards")}</span>
              <div className="inline-flex gap-1 text-xs">
                <Trans
                  t={t}
                  defaults={`You have assets that can be staked. <Highlight>Earn now <ExternalLinkIcon /></Highlight>`}
                  components={{
                    Highlight: <span className="text-primary-500 flex gap-1" />,
                    ExternalLinkIcon: <ExternalLinkIcon />,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="self-start">
            <XIcon role="button" onClick={handleDismissStakingBanner} className="h-6" />
          </div>
        </button>
      )}
    </>
  )
}

export const StakingBanner = ({ addresses }: { addresses: string[] }) => (
  <Suspense fallback={<SuspenseTracker name="StakingBanner" />}>
    <StakingBannerInner addresses={addresses} />
  </Suspense>
)
