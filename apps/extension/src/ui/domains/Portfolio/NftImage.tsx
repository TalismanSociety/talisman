import { classNames } from "@talismn/util"
import { useState } from "react"

import imgUnknownNft from "@talisman/theme/images/unknown-nft.svg?url"

export const NftImage = ({
  src,
  className,
  alt,
}: {
  src?: string | null
  alt?: string
  className?: string
}) => {
  const [imageUrl, setImageUrl] = useState<string>(src || imgUnknownNft)

  return (
    <img
      onError={() => setImageUrl(imgUnknownNft)}
      className={classNames("size-16 shrink-0 rounded-sm", className)}
      src={imageUrl}
      alt={alt}
    />
  )
}
