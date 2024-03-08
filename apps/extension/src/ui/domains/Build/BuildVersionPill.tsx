import { RELEASE_NOTES_URL } from "@extension/shared"
import { KeyIcon } from "@talismn/icons"
import { useAppState } from "@ui/hooks/useAppState"
import { FC, useCallback } from "react"
import { PillButton } from "talisman-ui"

export interface BuildVersioProps {
  className?: string
}

export const BuildVersionPill: FC<{ className?: string }> = ({ className }) => {
  const [hasSpiritKey] = useAppState("hasSpiritKey")

  const handleClick = useCallback(() => {
    window.open(RELEASE_NOTES_URL, "_blank")
  }, [])

  return (
    <PillButton className={className} onClick={handleClick}>
      <div className="flex items-center gap-2">
        <span>v{process.env.VERSION}</span>
        {hasSpiritKey && (
          <span className="pb-1">
            <KeyIcon className="text-primary-500 inline-block" />
          </span>
        )}
      </div>
    </PillButton>
  )
}
