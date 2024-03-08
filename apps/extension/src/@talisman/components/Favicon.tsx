import { IS_FIREFOX } from "@extension/shared"
import { classNames } from "@talismn/util"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import { FC } from "react"

export const Favicon: FC<{ url: string; className?: string }> = ({ url, className }) => {
  const iconUrl = useFaviconUrl(url)

  return (
    <span
      className={classNames(
        "flex h-[1.2em] w-[1.2em] shrink-0 items-center justify-center overflow-hidden rounded-full bg-black",
        className
      )}
    >
      {!!iconUrl && (
        <img
          className="h-[1em] w-[1em]"
          loading="lazy"
          // required for chrome to work around the manifest rule, but breaks firefox as it enforces CORS
          crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
          src={iconUrl}
          alt=""
        />
      )}
    </span>
  )
}
