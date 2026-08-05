import { AlertCircleIcon } from "@talismn/icons"
import type { FC, PropsWithChildren } from "react"

export const BittensorClaimAlert: FC<PropsWithChildren> = ({ children }) => (
  <div className="mb-8 flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs leading-paragraph">
    <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
    <span>{children}</span>
  </div>
)
