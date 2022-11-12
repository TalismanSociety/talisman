import { FC, useCallback, useEffect, useRef, useState } from "react"
import { imgSrcToBlob } from "blob-util"
import { useQuery } from "@tanstack/react-query"
import { classNames } from "../utils"
import svgError from "../icons/x-circle.svg?url"

export type UnsafeImageProps = React.DetailedHTMLProps<
  React.ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
>

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
      ref={refImg}
      className={classNames(
        props.className,
        "indent-[-999em] leading-[0]",
        isLoading && "animate-pulse"
        // TODO instruction `padding:50% 0` doesn't work, might have to add it to styles.css
        // isError &&
        //   `border-alert-error after:bg-brand-blue after:p-[50% 0]  after:content-[' '] after:relative after:block after:bg-[url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/1255/image-not-found.svg')] after:bg-cover`
      )}
      onLoadStart={handleLoadStart}
      onLoad={handleLoad}
      onError={handleError}
      //src={isError ? "" : `${props.src}`}
    />
  )
}
