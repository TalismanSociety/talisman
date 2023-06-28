import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useRef, useState } from "react"

export type UnsafeImageProps = React.DetailedHTMLProps<
  React.ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
>

const IS_FIREFOX = navigator.userAgent.toLowerCase().includes("firefox")

// Use for slow loading images, or images that may not load properly such as NFTs from ipfs
// TODO error fallback image/style ?
export const UnsafeImage: FC<UnsafeImageProps> = ({ ...props }) => {
  const refImg = useRef<HTMLImageElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // reset if src changes
    setIsError(false)
  }, [props.src])

  const handleLoadStart: React.ReactEventHandler<HTMLImageElement> = useCallback(
    (e) => {
      if (isError) return
      setIsLoading(true)
      props.onLoadStart?.(e)
    },
    [isError, props]
  )

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = useCallback(
    (e) => {
      setIsLoading(false)
      props.onLoad?.(e)
    },
    [props]
  )
  const handleError: React.ReactEventHandler<HTMLImageElement> = useCallback(
    (e) => {
      setIsLoading(false)
      setIsError(true)
      props.onError?.(e)
    },
    [props]
  )

  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      ref={refImg}
      className={classNames(
        props.className,
        "indent-[-999em] leading-[0]",
        isLoading && "animate-pulse"
      )}
      loading="lazy"
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      onLoadStart={handleLoadStart}
      onLoad={handleLoad}
      onError={handleError}
    />
  )
}
