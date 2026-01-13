import { XIcon } from "@talismn/icons"
import { useAccounts, useAppState, useFeatureFlag } from "@ui/state"
import { isAccountAddressSs58 } from "extension-core"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, useOpenClose } from "talisman-ui"

import { AssetHubMigrationModal } from "./AssetHubMigrationModal"
import imgBackground from "./banner-bg.png"

export const AssetHubMigrationBanner = () => {
  const { t } = useTranslation()
  const accounts = useAccounts()
  const allowBanner = useFeatureFlag("ASSET_HUB_MIGRATION_BANNER")
  const [hideBanner, setHideBanner] = useAppState("hideAssetHubMigrationBanner")
  const ocDialog = useOpenClose()

  const showBanner = useMemo(
    () => !!allowBanner && !hideBanner && accounts.some(isAccountAddressSs58),
    [allowBanner, hideBanner, accounts]
  )

  if (!showBanner) return null

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={ocDialog.open}
        className="relative h-[8rem] w-full shrink-0 overflow-hidden rounded-sm p-0.5 text-left text-xs"
      >
        <div className="absolute inset-0 rounded-sm bg-gradient-to-l from-[#606060]/60 to-[#E6007A]" />
        <div className="relative size-full overflow-hidden rounded-sm bg-gradient-to-b from-30% from-black-secondary to-[#3F3F0C]/50 to-[200%]">
          <div className="absolute top-0 left-0 z-10 flex size-full flex-col justify-center gap-2 overflow-hidden px-8">
            <div className="truncate font-bold text-body text-sm">{t("Asset Hub Migration")}</div>
            <p className="line-clamp-2 max-w-[70%] text-body-secondary">
              {t("DOT Balances and staking are moving to Polkadot Asset Hub")}
            </p>
          </div>
          <div className="absolute top-0 right-12 flex h-full flex-col justify-center">
            <img src={imgBackground} alt="" className="h-[90%]" />
          </div>
        </div>
      </button>
      <div className="absolute top-0 right-0 z-10 select-none p-4">
        <IconButton className="select-auto text-md text-white" onClick={() => setHideBanner(true)}>
          <XIcon />
        </IconButton>
      </div>
      <AssetHubMigrationModal isOpen={ocDialog.isOpen} onClose={ocDialog.close} />
    </div>
  )
}
