import { ArrowRightIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { isAccountAddressSs58 } from "extension-core"
import { FC, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useAccounts, useAppState, useFeatureFlag } from "@ui/state"

export const UnifiedAddressInfoBanner = () => {
  const { t } = useTranslation()
  const allowBanner = useFeatureFlag("UNIFIED_ADDRESS_BANNER")
  const [hideBanner, setHideBanner] = useAppState("hideUnifiedAddressBanner")
  const accounts = useAccounts()

  const showBanner = useMemo(
    () => allowBanner && !hideBanner && accounts.some(isAccountAddressSs58),
    [accounts, allowBanner, hideBanner],
  )

  if (!showBanner) return null

  return (
    <div
      className={classNames(
        "relative z-0 overflow-hidden",
        "text-tiny select-none rounded-sm px-6 py-4",
        "bg-gradient-to-r from-[#9F7998] to-[#EB5D93]",
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-4 text-base">
          <div className="grow font-bold">{t("Unified address format")}</div>
          <div>
            <IconButton
              className="text-md text-body select-auto"
              onClick={() => setHideBanner(true)}
            >
              <XIcon />
            </IconButton>
          </div>
        </div>
        <p>
          <Trans
            t={t}
            defaults="Polkadot is unifying account formats across parachains.<br />Verify addresses during the transition to ensure smooth transfers."
          ></Trans>
        </p>
        <div className="text-tiny mt-5 flex items-center justify-between">
          <div className="flex h-12 flex-col justify-center rounded-lg bg-white/10 px-6">
            5EoJmkBANK...os4rNjjoTt
          </div>
          <ArrowRightIcon className="shrink-0 text-sm" />
          <div className="flex h-12 flex-col justify-center rounded-lg bg-white/10 px-6">
            13jbv5SEE6...oDcwQFvFg2
          </div>
        </div>
      </div>
      <BgIcon className="absolute -right-1 top-[2.2rem] h-[10.1rem] w-[16.5rem] fill-[#FF0067] opacity-20" />
    </div>
  )
}

const BgIcon: FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 101" fill="none" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M115.516 18.1681C115.516 28.202 101.18 36.3361 83.495 36.3361C65.8106 36.3361 51.4743 28.202 51.4743 18.1681C51.4743 8.13412 65.8106 0 83.495 0C101.18 0 115.516 8.13412 115.516 18.1681ZM115.516 154.989C115.516 165.023 101.18 173.157 83.495 173.157C65.8106 173.157 51.4742 165.023 51.4742 154.989C51.4742 144.955 65.8106 136.821 83.495 136.821C101.18 136.821 115.516 144.955 115.516 154.989ZM38.8651 61.4555C47.7074 46.523 47.6525 30.3518 38.7422 25.3361C29.832 20.3204 15.4407 28.3596 6.59837 43.2921C-2.24396 58.2246 -2.18896 74.3955 6.72126 79.4114C15.6315 84.4273 30.0227 76.3879 38.8651 61.4555ZM160.278 93.7446C169.19 98.7612 169.248 114.933 160.405 129.866C151.563 144.798 137.17 152.836 128.257 147.82C119.345 142.803 119.288 126.63 128.13 111.698C136.973 96.7653 151.366 88.7272 160.278 93.7446ZM38.7427 147.824C47.6552 142.807 47.712 126.635 38.8696 111.703C30.0273 96.7702 15.6342 88.7321 6.72173 93.7488C-2.19075 98.7661 -2.2476 114.938 6.59473 129.871C15.4371 144.803 29.8302 152.841 38.7427 147.824ZM160.402 43.2863C169.245 58.2188 169.188 74.3912 160.275 79.4078C151.363 84.4252 136.97 76.3871 128.128 61.4543C119.285 46.5219 119.342 30.3496 128.254 25.3326C137.167 20.3156 151.56 28.3538 160.402 43.2863Z"
    />
  </svg>
)
