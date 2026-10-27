import { Checkbox } from "@ui/components/Checkbox"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import type { SignInDomainMismatch } from "./hooks/useSignInDomainMismatch"
import { SignAlertMessage } from "./SignAlertMessage"

export const SignInDomainMismatchAlert: FC<{
  mismatch: SignInDomainMismatch
  className?: string
}> = ({ mismatch: { isMismatch, isAcknowledged, setIsAcknowledged }, className }) => {
  const { t } = useTranslation()

  if (!isMismatch) return null

  return (
    <SignAlertMessage type="error" errorCategory={null} className={className}>
      <div className="flex flex-col gap-4">
        <div>{t("Sign in domain is different from website domain.")}</div>
        <Checkbox checked={isAcknowledged} onChange={(e) => setIsAcknowledged(e.target.checked)}>
          {t("I understand the risk, sign in anyway")}
        </Checkbox>
      </div>
    </SignAlertMessage>
  )
}
