import { cn } from "@ui/util/cn"
import { type FC, useCallback, useEffect, useRef, useState } from "react"

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
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
    // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
    [isError, props]
  )

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = useCallback(
    (e) => {
      setIsLoading(false)
      props.onLoad?.(e)
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
    [props]
  )
  const handleError: React.ReactEventHandler<HTMLImageElement> = useCallback(
    (e) => {
      setIsLoading(false)
      setIsError(true)
      props.onError?.(e)
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
    [props]
  )

  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      ref={refImg}
      className={cn(props.className, "indent-[-999em] leading-0", isLoading && "animate-pulse")}
      loading="lazy"
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      onLoadStart={handleLoadStart}
      onLoad={handleLoad}
      onError={handleError}
    />
  )
}
