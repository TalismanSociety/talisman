import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { RootRoutes } from "@ui/util/RootRoutes"
import { Suspense } from "react"
import { Route } from "react-router-dom"

import { Footer } from "./Footer"
import { MainHeader } from "./MainHeader"
import { MainSidebar } from "./MainSidebar"
import { SettingsHeader } from "./SettingsHeader"
import { SettingsSidebar } from "./SettingsSidebar"

// TODO: Convert to a property instead of using react router
export const SidebarLayout = () => {
  return (
    <div className="bg-grey-850 flex w-[7.4rem] shrink-0 flex-col overflow-hidden md:w-[17.2rem] lg:w-[32rem]">
      <Suspense fallback={<SuspenseTracker name="Sidebar" />}>
        <RootRoutes>
          <Route path="accounts/*" element={<Settings />} />
          <Route path="settings/*" element={<Settings />} />
          <Route path="tokens/*" element={<Settings />} />
          <Route path="networks/*" element={<Settings />} />
          <Route path="*" element={<Main />} />
        </RootRoutes>
      </Suspense>
    </div>
  )
}

const Main = () => (
  <>
    <MainHeader />
    <ScrollContainer className="flex-grow">
      <MainSidebar />
    </ScrollContainer>
    <Footer />
  </>
)

const Settings = () => (
  <>
    <SettingsHeader />
    <ScrollContainer className="flex-grow">
      <SettingsSidebar />
    </ScrollContainer>
    <Footer />
  </>
)
