import { ImageIcon, QuestionCircleIcon } from "@talismn/icons"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { IPFS_GATEWAY } from "extension-shared"
import React, { CSSProperties, memo, useCallback, useMemo, useState } from "react"

export const RiskAnalysisImageBase: React.FC<{
  src?: string | null | undefined
  isSolanaLogo?: boolean
  width: number
  height: number
  borderRadius?: CSSProperties["borderRadius"]
  alt: string
  type: "nft" | "currency" | "unknown"
}> = memo(function ImageBase({ src: originalSrc, width, height, borderRadius, alt, type }) {
  const src = originalSrc?.startsWith("ipfs://") ? IPFS_GATEWAY + originalSrc.slice(7) : originalSrc
  const [hasPlaceholder, setHasPlaceholder] = useState(!src)
  const handleImageError = useCallback(() => {
    setHasPlaceholder(true)
  }, [])
  const content = useMemo(() => {
    if (hasPlaceholder || !src) {
      return (
        <RiskAnalysisPlaceholderImage
          type={type}
          width={width}
          height={height}
          borderRadius={borderRadius}
        />
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
  }, [hasPlaceholder, src, width, height, borderRadius, handleImageError, alt, type])
  return <div className="flex flex-col">{content}</div>
})

export const RiskAnalysisPlaceholderImage: React.FC<{
  width: number
  height: number
  borderRadius?: CSSProperties["borderRadius"]
  type: "nft" | "currency" | "unknown"
}> = ({ width, height, borderRadius, type }) => {
  const style = useMemo<CSSProperties>(
    () => ({ width, height, borderRadius }),
    [borderRadius, height, width]
  )

  return (
    <div
      style={style}
      className="bg-grey-800 text-md text-body-disabled flex flex-col items-center justify-center"
    >
      {type === "nft" && <ImageIcon />}
      {type === "currency" && <TokenLogo className="h-full w-full" />}
      {type === "unknown" && <QuestionCircleIcon />}
    </div>
  )
}
