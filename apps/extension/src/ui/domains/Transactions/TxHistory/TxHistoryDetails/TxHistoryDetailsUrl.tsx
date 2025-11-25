import { FC, useMemo } from "react"

import { Favicon } from "@talisman/components/Favicon"

export const TxHistoryDetailsUrl: FC<{
  url: string
}> = ({ url }) => {
  const displayUrl = useMemo(() => {
    try {
      const uri = new URL(url)
      return uri.origin
    } catch {
      return url
    }
  }, [url])

  return (
    <div className="flex flex-row items-center gap-2 truncate">
      <Favicon url={url} className="shrink-0" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
        {displayUrl}
      </a>
    </div>
  )
}
