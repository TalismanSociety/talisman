import { classNames } from "@talismn/util"
import { useState } from "react"

import imgUnknownNft from "@talisman/theme/images/unknown-nft.svg?url"
import { getSafeImageUrl } from "@ui/util/getSafeImageUrl"

export const NftImage = ({
  src,
  className,
  alt,
}: {
  src?: string | null
  alt?: string
  className?: string
}) => {
  const [imageUrl, setImageUrl] = useState<string>(src ? getSafeImageUrl(src) : imgUnknownNft)

  // loading indicator handling: it sometimes takes a while before a IPFS resource fails on 404
  const [isLoading, setIsLoading] = useState<boolean>(!!src)
  const [hasError, setHasError] = useState<boolean>(false)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    setImageUrl(imgUnknownNft)
  }

  return (
    <div
      className={classNames(
        "bg-grey-800 relative size-16 shrink-0 overflow-hidden rounded-sm",
        className,
      )}
    >
      {isLoading && !hasError && (
        <img src={imgUnknownNft} className="size-full shrink-0 animate-pulse" alt="Loading" />
      )}
      <img
        onLoad={handleLoad}
        onError={handleError}
        className={classNames("size-full shrink-0", className)}
        src={imageUrl}
        alt={alt}
      />
    </div>
  )
}
