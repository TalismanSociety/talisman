import { Suspense } from "react"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { Footer } from "./Footer"
import { SettingsHeader } from "./SettingsHeader"
import { SettingsSidebar } from "./SettingsSidebar"

export const SidebarLayout = () => {
  return (
    <div className="bg-grey-850 flex w-[7.4rem] shrink-0 flex-col overflow-hidden md:w-[17.2rem] lg:w-[32rem]">
      <Suspense fallback={<SuspenseTracker name="Sidebar" />}>
        <SettingsHeader />
        <ScrollContainer className="flex-grow">
          <SettingsSidebar />
        </ScrollContainer>
        <Footer />
      </Suspense>
    </div>
  )
}
