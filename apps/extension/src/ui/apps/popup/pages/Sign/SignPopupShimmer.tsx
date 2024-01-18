import { PopupHeader, PopupLayout } from "@ui/apps/popup/Layout/PopupLayout"
import { SignViewBodyShimmer } from "@ui/domains/Sign/Views/SignViewBodyShimmer"

export const SignPopupShimmer = () => (
  <PopupLayout>
    <PopupHeader className="invisible" />
    <SignViewBodyShimmer />
  </PopupLayout>
)
