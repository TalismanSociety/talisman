import { Suspense } from "react"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { SupportOpsBackup } from "./SupportOpsBackupButton"
import { SupportOpsRestoreButton } from "./SupportOpsRestoreButton"

export const SupportOpsPage = () => (
  <Suspense fallback={<SuspenseTracker name="Support" />}>
    <div className="container mx-auto flex w-[80rem] flex-col gap-20 py-40">
      <HeaderBlock
        title="Talisman Support Operations"
        text="Use this page to back up or restore your Talisman data."
      />
      <div className="grid grid-cols-2 gap-10">
        <SupportOpsBackup />
        <SupportOpsRestoreButton />
      </div>
    </div>
  </Suspense>
)
