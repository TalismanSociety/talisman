import { SeekBenefitsBanner } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsBanner"

import { NewFeaturesButton } from "../NewFeaturesButton"
import { BackupReminderBanner } from "./BackupReminderBanner"
import { UnifiedAddressInfoBanner } from "./UnifiedAddressInfoBanner"

export const PopupHomeBanners = () => {
  return (
    <>
      <BackupReminderBanner />
      <NewFeaturesButton />
      <UnifiedAddressInfoBanner />
      <SeekBenefitsBanner variant="small" />
    </>
  )
}
