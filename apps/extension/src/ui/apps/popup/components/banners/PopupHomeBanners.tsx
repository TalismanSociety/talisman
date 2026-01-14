import { SeekBenefitsBanner } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsBanner"

import { NewFeaturesButton } from "../NewFeaturesButton"
import { AssetHubMigrationBanner } from "./AssetHubMigration/AssetHubMigrationBanner"
import { BackupReminderBanner } from "./BackupReminderBanner"
import { UnifiedAddressInfoBanner } from "./UnifiedAddressInfoBanner"

export const PopupHomeBanners = () => {
  return (
    <>
      <BackupReminderBanner />
      <NewFeaturesButton />
      <UnifiedAddressInfoBanner />
      <SeekBenefitsBanner variant="small" />
      <AssetHubMigrationBanner />
    </>
  )
}
