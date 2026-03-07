import * as Sentry from "@sentry/browser"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { type FC, useMemo } from "react"

import { Favicon } from "./Favicon"

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
        <div className="flex max-w-[22rem] items-center gap-2 rounded-3xl bg-grey-800 px-4 py-2 font-light text-body-secondary text-sm">
          <Favicon url={url} className="text-base" />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{host}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{url}</TooltipContent>
    </Tooltip>
  )
}
