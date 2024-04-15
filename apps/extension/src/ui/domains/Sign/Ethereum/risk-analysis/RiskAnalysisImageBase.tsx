import React, { CSSProperties, memo, useCallback, useMemo, useState } from "react"

import { RiskAnalysisIcon } from "./RiskAnalysisIcon"

// TODO might want a different placeholder for currencies & nfts
export const RiskAnalysisImageBase: React.FC<{
  src?: string | null | undefined
  isSolanaLogo?: boolean
  width: number
  height: number
  borderRadius?: CSSProperties["borderRadius"]
  alt: string
}> = memo(function ImageBase({ src: originalSrc, width, height, borderRadius, alt }) {
  const src = originalSrc?.startsWith("ipfs://")
    ? "https://ipfs.io/ipfs/" + originalSrc.slice(7)
    : originalSrc
  const [hasPlaceholder, setHasPlaceholder] = useState(!src)
  const handleImageError = useCallback(() => {
    setHasPlaceholder(true)
  }, [])
  const content = useMemo(() => {
    if (hasPlaceholder || !src) {
      return (
        <RiskAnalysisPlaceholderImage width={width} height={height} borderRadius={borderRadius} />
      )
    } else {
      return (
        <img
          width={width}
          height={height}
          src={src}
          onError={handleImageError}
          alt={alt}
          className="rounded-sm object-cover"
        />
      )
    }
  }, [hasPlaceholder, src, width, height, borderRadius, handleImageError, alt])
  return <div className="flex flex-col">{content}</div> // <Column>{content}</Column>
})

export const RiskAnalysisPlaceholderImage: React.FC<{
  width: number
  height: number
  borderRadius?: CSSProperties["borderRadius"]
}> = ({ width, height, borderRadius }) => {
  const style = useMemo<CSSProperties>(
    () => ({ width, height, borderRadius }),
    [borderRadius, height, width]
  )
  return (
    <div style={style} className="flex flex-col">
      <RiskAnalysisIcon variant="blowfish-logo" size={Math.floor(width / 1.5)} />
    </div>
  )
}
