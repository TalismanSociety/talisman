import { SeekBenefitsBanner } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsBanner"

import { NewFeaturesButton } from "../NewFeaturesButton"
import { BackupReminderBanner } from "./BackupReminderBanner"

export const PopupHomeBanners = () => {
  return (
    <>
      <BackupReminderBanner />
      <NewFeaturesButton />
      <SeekBenefitsBanner variant="small" />
    </>
  )
}
