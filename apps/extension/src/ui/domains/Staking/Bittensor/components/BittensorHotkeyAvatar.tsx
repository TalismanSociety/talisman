import { IS_FIREFOX } from "@common/constants"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { useGithubImageUrl } from "@ui/hooks/useGithubImageUrl"
import { cn } from "@ui/util/cn"
import type { FC } from "react"

import { useBittensorHotkeyLogoUrl } from "../hooks/useBittensorHotkeyLogoUrl"

export const BittensorHotkeyAvatar: FC<{ hotkey: string; className?: string }> = ({
  hotkey,
  className,
}) => {
  const logoUrl = useBittensorHotkeyLogoUrl(hotkey)
  const { src, onError } = useGithubImageUrl(logoUrl)

  if (!src) return <AccountIcon address={hotkey} className={className} />

  return (
    <div className={cn("relative inline-block shrink-0", className)}>
      <img
        key={src}
        src={src}
        alt=""
        className="block size-[1em] rounded-full"
        crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
        loading="lazy"
        onError={onError}
      />
    </div>
  )
}
