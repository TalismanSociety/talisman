import { isEthereumAddress } from "@polkadot/util-crypto"
import { CopyIcon, ExternalLinkIcon } from "@talisman/theme/icons"
import { copyAddress } from "@ui/util/copyAddress"
import { FC, ReactNode, useCallback, useMemo } from "react"
import { classNames } from "talisman-ui"

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
    else if (address && isEthereumAddress(address)) copyAddress(address)
  }, [address, url])

  return (
    <button
      onClick={handleClick}
      className={classNames(
        "text-body-secondary inline-flex h-[1.2em] gap-3 px-4 text-base hover:text-white",
        className
      )}
    >
      {iconPrefix && <div className="flex h-full flex-col justify-center">{iconPrefix}</div>}
      <div className={contentClassName}>{children}</div>
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
