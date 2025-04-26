import { Suspense } from "react"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { RescueBackup } from "./RescueBackup"
import { RescueRestore } from "./RescueRestore"

export const Rescue = () => (
  <Suspense fallback={<SuspenseTracker name="Rescue" />}>
    <div className="container mx-auto flex w-[80rem] flex-col gap-20 py-40">
      <HeaderBlock
        title="Talisman Rescue Operations"
        text="This page allows you to backup or restore Talisman."
      />
      <div className="grid grid-cols-2 gap-10">
        <RescueBackup />
        <RescueRestore />
      </div>
    </div>
  </Suspense>
)
