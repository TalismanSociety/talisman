import * as Sentry from "@sentry/browser"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

const Favicon: FC<{ url: string }> = ({ url }) => {
  const iconUrl = useFaviconUrl(url)

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black">
      {!!iconUrl && (
        <img
          className="h-8 w-8"
          loading="lazy"
          crossOrigin="anonymous"
          src={iconUrl}
          alt={`favicon ${url}`}
        />
      )}
    </span>
  )
}

export const AppPill: FC<{ url?: string }> = ({ url }) => {
  const host = useMemo(() => {
    try {
      if (!url) return null
      const typedUrl = new URL(url)
      return typedUrl.hostname
    } catch (err) {
      Sentry.captureException(err)
      return null
    }
  }, [url])

  if (!url || !host) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="text-body-secondary bg-grey-800 flex max-w-[22rem] items-center gap-2  rounded-3xl px-4 py-2 text-sm font-light">
          <Favicon url={url} />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{host}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{url}</TooltipContent>
    </Tooltip>
  )
}
