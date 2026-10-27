import { AlertCircleIcon } from "@talismn/icons"
import { Checkbox } from "@ui/components/Checkbox"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import type { SignInDomainMismatch } from "./hooks/useSignInDomainMismatch"

export const SignInDomainMismatchAlert: FC<{
  mismatch: SignInDomainMismatch
  className?: string
}> = ({ mismatch: { isMismatch, isAcknowledged, setIsAcknowledged }, className }) => {
  const { t } = useTranslation()

  if (!isMismatch) return null

  return (
    <div className={cn("w-full rounded border border-alert-warn/30 text-left", className)}>
      <div className="flex items-center gap-5 p-6 text-alert-warn">
        <AlertCircleIcon className="shrink-0 text-[1.25rem]" />
        <div className="text-[0.6875rem] leading-[0.875rem]">
          {t("Sign in domain is different from website domain.")}
        </div>
      </div>
      <Checkbox
        className="w-full gap-[0.6875rem] border-alert-warn/30 border-t pt-5 pr-6 pb-6 pl-8 text-grey-200 text-xs leading-[1.05rem]"
        checked={isAcknowledged}
        onChange={(e) => setIsAcknowledged(e.target.checked)}
      >
        {t("I understand the risk, sign in anyway")}
      </Checkbox>
    </div>
  )
}
