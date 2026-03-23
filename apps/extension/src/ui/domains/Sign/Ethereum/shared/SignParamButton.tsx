import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"

import { copyAddress } from "@ui/util/copyAddress"
import { type FC, type ReactNode, useCallback, useMemo } from "react"

export type SignParamButtonProps = {
  iconPrefix?: ReactNode
  explorerUrl?: string | null
  address?: string
  children: ReactNode
  withIcon?: boolean
  className?: string
  contentClassName?: string
}

export const SignParamButton: FC<SignParamButtonProps> = ({
  explorerUrl,
  iconPrefix,
  address,
  children,
  withIcon,
  className,
  contentClassName,
}) => {
  const url = useMemo(
    () => (explorerUrl && address ? `${explorerUrl}/address/${address}` : undefined),
    [address, explorerUrl]
  )

  const handleClick = useCallback(() => {
    if (url) window.open(url, "_blank")
    else if (address) copyAddress(address)
  }, [address, url])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex h-[1.2em] max-w-full gap-3 overflow-hidden text-ellipsis whitespace-nowrap px-4 text-base text-body-secondary hover:text-white",
        className
      )}
    >
      {iconPrefix && (
        <div className="flex h-full shrink-0 flex-col justify-center">{iconPrefix}</div>
      )}
      <div className={cn("max-w-full overflow-hidden text-ellipsis", contentClassName)}>
        {children}
      </div>
      {withIcon && (
        <div>
          {url ? (
            <ExternalLinkIcon className="transition-none" />
          ) : (
            <CopyIcon className="transition-none" />
          )}
        </div>
      )}
    </button>
  )
}
