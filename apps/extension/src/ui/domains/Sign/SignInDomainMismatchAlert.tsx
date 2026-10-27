import { AlertTriangleIcon } from "@talismn/icons"
import { Checkbox } from "@ui/components/Checkbox"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import type { SignInDomainMismatch } from "./hooks/useSignInDomainMismatch"

const INVISIBLE_OR_BIDI = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g

const revealHiddenCharacters = (domain: string) =>
  domain.replace(INVISIBLE_OR_BIDI, (char) => `\\u${char.charCodeAt(0).toString(16).toUpperCase()}`)

const DomainRow: FC<{ label: string; domain: string; isForeign?: boolean }> = ({
  label,
  domain,
  isForeign,
}) => (
  <>
    <dt className="text-body-secondary">{label}</dt>
    <dd className={cn("break-all font-bold", isForeign ? "text-alert-warn" : "text-body")}>
      {revealHiddenCharacters(domain)}
    </dd>
  </>
)

export const SignInDomainMismatchAlert: FC<{
  mismatch: SignInDomainMismatch
  className?: string
}> = ({
  mismatch: { isMismatch, signInDomain, siteHost, isAcknowledged, setIsAcknowledged },
  className,
}) => {
  const { t } = useTranslation()

  if (!isMismatch) return null

  return (
    <div className={cn("w-full rounded-sm bg-alert-warn/10 text-left text-xs", className)}>
      <div className="flex items-start gap-4 p-5">
        <AlertTriangleIcon className="mt-[0.1rem] shrink-0 text-alert-warn text-base" />
        <div className="flex min-w-0 grow flex-col gap-3">
          <div className="font-bold text-body text-sm">
            {t("This sign-in is for another website")}
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-6 gap-y-1">
            <DomainRow
              label={t("Signs you in to")}
              domain={signInDomain || t("No domain")}
              isForeign
            />
            {siteHost && <DomainRow label={t("Requested by")} domain={siteHost} />}
          </dl>
        </div>
      </div>
      <Checkbox
        className="w-full flex-row-reverse justify-between border-alert-warn/20 border-t px-5 py-4 text-body"
        checked={isAcknowledged}
        onChange={(e) => setIsAcknowledged(e.target.checked)}
      >
        {t("I understand the risk, sign in anyway")}
      </Checkbox>
    </div>
  )
}
