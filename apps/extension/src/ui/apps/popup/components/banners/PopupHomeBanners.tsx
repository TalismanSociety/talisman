import { NewFeaturesButton } from "../NewFeaturesButton"
import { BackupReminderBanner } from "./BackupReminderBanner"
import { SeekBenefitsBanner } from "./SeekBenefitsBanner"
import { UnifiedAddressInfoBanner } from "./UnifiedAddressInfoBanner"

export const PopupHomeBanners = () => {
  return (
    <>
      <BackupReminderBanner />
      <NewFeaturesButton />
      <UnifiedAddressInfoBanner />
      <SeekBenefitsBanner />
    </>
  )
}
