import imgUnknownNft from "@ui/theme/images/unknown-nft.svg?url"
import { cn } from "@ui/util/cn"
import { getSafeImageUrl } from "@ui/util/getSafeImageUrl"
import { useState } from "react"

type NftImageProps = {
  src?: string | null
  isPending?: boolean
  alt?: string
  className?: string
}

export const NftImage = (props: NftImageProps) => <NftImageForSrc key={props.src} {...props} />

const NftImageForSrc = ({ src, isPending, className, alt }: NftImageProps) => {
  const [imageUrl, setImageUrl] = useState<string>(src ? getSafeImageUrl(src) : imgUnknownNft)

  // loading indicator handling: it sometimes takes a while before a IPFS resource fails on 404
  const [isLoading, setIsLoading] = useState<boolean>(!!src)
  const isPulsing = src ? isLoading : !!isPending

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setImageUrl(imgUnknownNft)
  }

  return (
    <div
      className={cn("relative size-16 shrink-0 overflow-hidden rounded-sm bg-grey-800", className)}
    >
      {isPulsing && (
        <img src={imgUnknownNft} className="size-full shrink-0 animate-pulse" alt="Loading" />
      )}
      <img
        onLoad={handleLoad}
        onError={handleError}
        className={cn("size-full shrink-0", className)}
        src={imageUrl}
        alt={alt}
      />
    </div>
  )
}
