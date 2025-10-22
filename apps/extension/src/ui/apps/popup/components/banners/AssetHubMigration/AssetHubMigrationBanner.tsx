import { XIcon } from "@talismn/icons"
import { isAccountAddressSs58 } from "extension-core"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, useOpenClose } from "talisman-ui"

import { useAccounts, useAppState, useFeatureFlag } from "@ui/state"

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
    [allowBanner, hideBanner, accounts],
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
        <div className="from-black-secondary relative size-full overflow-hidden rounded-sm bg-gradient-to-b from-30% to-[#3F3F0C]/50 to-[200%]">
          <div className="absolute left-0 top-0 z-10 flex size-full flex-col justify-center gap-2 overflow-hidden px-8">
            <div className="text-body truncate text-sm font-bold">{t("Asset Hub Migration")}</div>
            <p className="text-body-secondary line-clamp-2 max-w-[70%]">
              {t("DOT Balances and staking are moving to Polkadot Asset Hub")}
            </p>
          </div>
          <div className="absolute right-12 top-0 flex h-full flex-col justify-center">
            <img src={imgBackground} alt="" className="h-[90%]" />
          </div>
        </div>
      </button>
      <div className="absolute right-0 top-0 z-10 select-none p-4">
        <IconButton className="text-md select-auto text-white" onClick={() => setHideBanner(true)}>
          <XIcon />
        </IconButton>
      </div>
      <AssetHubMigrationModal isOpen={ocDialog.isOpen} onClose={ocDialog.close} />
    </div>
  )
}
