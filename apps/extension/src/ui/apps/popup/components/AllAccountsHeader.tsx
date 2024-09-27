import { ChevronRightIcon } from "@talismn/icons"
import { TalismanOrbRectangle } from "@talismn/orb"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useHoverDirty } from "react-use"

import { AccountJsonAny } from "@extension/core"
import { TotalFiatBalance } from "@ui/apps/popup/components/TotalFiatBalance"

export const AllAccountsHeader: FC<{ accounts: AccountJsonAny[] }> = ({ accounts }) => {
  const navigate = useNavigate()
  const handleClick = useCallback(() => navigate("/portfolio/tokens"), [navigate])
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useHoverDirty(ref)
  const disabled = useMemo(() => !accounts.length, [accounts.length])

  return (
    <div ref={ref} className="relative h-[14rem] w-full">
      <button
        type="button"
        className={classNames(
          "flex size-full items-center justify-end gap-4 overflow-hidden rounded-sm p-6 text-lg",
          "bg-black-secondary text-body-secondary transition-colors duration-75",
          !disabled && "hover:text-body"
        )}
        onClick={!disabled ? handleClick : undefined}
        disabled={disabled}
      >
        {!disabled && !!accounts?.[0]?.address && (
          <TalismanOrbRectangle
            seed={accounts[0].address}
            className="absolute left-0 top-0 z-0 size-full select-none rounded-sm opacity-30"
          />
        )}
        {!disabled && <ChevronRightIcon className="z-10" />}
      </button>
      <TotalFiatBalance
        className="pointer-events-none absolute left-0 top-0 size-full p-6"
        mouseOver={isHovered}
        disabled={disabled}
      />
    </div>
  )
}
