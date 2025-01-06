import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { RampForm } from "@ui/domains/Ramp/RampForm"

import { AuthorisedSiteToolbar } from "../../components/AuthorisedSiteToolbar"

export const PortfolioRamp = () => {
  const { selectedFolder: folder } = usePortfolioNavigation()
  return (
    <>
      {!folder && <AuthorisedSiteToolbar />}
      <RampForm />
    </>
  )
}
