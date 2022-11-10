import { isEthereumAddress } from "@polkadot/util-crypto"
import { WithTooltip } from "@talisman/components/Tooltip"
import { CopyIcon, ExternalLinkIcon } from "@talisman/theme/icons"
import { Address } from "@ui/domains/Account/Address"
import AccountAvatar from "@ui/domains/Account/Avatar"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
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
        "text-body-secondary inline-flex items-start gap-3 px-4 pt-0.5 text-base hover:text-white",
        className
      )}
    >
      {iconPrefix && <div>{iconPrefix}</div>}
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
