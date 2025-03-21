import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, IconButton } from "talisman-ui"

import { api } from "@ui/api"
import { useAppState, useMnemonics, useSessionState } from "@ui/state"

export const KeyringUpgradeBanner = () => {
  const { t } = useTranslation()
  const mnemonics = useMnemonics()
  const [hideBanner, setHideBanner] = useAppState("hideKeyringUpgradeBanner")
  const [isSnoozed, setIsSnoozed] = useSessionState("isKeyringUpgradeBannerSnoozed")

  const showBanner = useMemo(
    () => !isSnoozed && !hideBanner && !!mnemonics.length,
    [hideBanner, mnemonics.length, isSnoozed],
  )

  const onHideClick = useCallback(() => setHideBanner(true), [setHideBanner])

  const onSnoozeClick = useCallback(() => setIsSnoozed(true), [setIsSnoozed])

  const goToMnemonics = useCallback(async () => {
    await Promise.all([api.dashboardOpen("/settings/mnemonics"), setIsSnoozed(true)])
    window.close()
  }, [setIsSnoozed])

  if (!showBanner) return null

  return (
    <div
      className={classNames(
        "relative z-0 overflow-hidden",
        "text-tiny select-none rounded-sm p-6",
        "border border-white",
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-4 text-base">
          <div className="flex grow items-center gap-2 font-bold">
            <WarningIcon className="inline-block" />
            <div className="text-sm">{t("Backup your recovery phrases")}</div>
          </div>
          <div>
            <IconButton className="text-md text-body select-auto" onClick={onSnoozeClick}>
              <XIcon />
            </IconButton>
          </div>
        </div>
        <p className="text-body-secondary mt-2">
          <Trans
            t={t}
            defaults="Wallet system upgrade on April 15, 2025. Make sure you've backed your recovery phrases now to secure access to your accounts. Only you have access to them."
          ></Trans>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Button
            small
            onClick={onHideClick}
            className="border-body-secondary text-body-secondary h-16 rounded-full text-xs"
          >
            {t("Don't remind me again")}
          </Button>

          <Button primary small onClick={goToMnemonics} className="h-16 rounded-full text-xs">
            {t("Backup Now")}
          </Button>
        </div>
      </div>
    </div>
  )
}

const WarningIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="28" height="28" rx="14" fill="#D5FF5C" fillOpacity="0.2" />
    <rect x="4.26086" y="4.26093" width="19.4783" height="19.4783" rx="9.73913" fill="#D5FF5C" />
    <g clipPath="url(#clip0_4288_6188)">
      <path
        d="M13.3061 10.6968L9.86902 16.4348C9.79815 16.5575 9.76065 16.6967 9.76026 16.8384C9.75986 16.9801 9.79658 17.1194 9.86675 17.2426C9.93693 17.3657 10.0381 17.4683 10.1603 17.5401C10.2824 17.612 10.4212 17.6506 10.5629 17.6522H17.4371C17.5788 17.6506 17.7177 17.612 17.8398 17.5401C17.9619 17.4683 18.0631 17.3657 18.1333 17.2426C18.2035 17.1194 18.2402 16.9801 18.2398 16.8384C18.2394 16.6967 18.2019 16.5575 18.131 16.4348L14.6939 10.6968C14.6216 10.5776 14.5197 10.479 14.3982 10.4105C14.2766 10.3421 14.1395 10.3062 14 10.3062C13.8605 10.3062 13.7234 10.3421 13.6019 10.4105C13.4803 10.479 13.3785 10.5776 13.3061 10.6968Z"
        stroke="black"
        strokeWidth="0.730435"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 12.7826V14.4058"
        stroke="black"
        strokeWidth="0.730435"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 16.029H14.0041"
        stroke="black"
        strokeWidth="0.730435"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_4288_6188">
        <rect
          width="9.73913"
          height="9.73913"
          fill="white"
          transform="translate(9.13043 9.13043)"
        />
      </clipPath>
    </defs>
  </svg>
)
