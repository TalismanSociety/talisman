import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useHoverDirty } from "react-use"
import { MYSTICAL_PHYSICS_V3, MysticalBackground, MysticalPhysicsV3 } from "talisman-ui"

import { AccountJsonAny } from "@extension/core"
import { TotalFiatBalance } from "@ui/apps/popup/components/TotalFiatBalance"
import { useAccountColors } from "@ui/hooks/useAccountColors"

const BG_CONFIG: MysticalPhysicsV3 = {
  ...MYSTICAL_PHYSICS_V3,
  artifacts: 2,
  radiusMin: 4,
  radiusMax: 4,
  opacityMin: 0.5,
  opacityMax: 0.5,
  durationMin: 12000,
  durationMax: 15000,
}

export const AllAccountsHeader: FC<{ accounts: AccountJsonAny[] }> = ({ accounts }) => {
  const navigate = useNavigate()
  const handleClick = useCallback(() => navigate("/portfolio/tokens"), [navigate])
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useHoverDirty(ref)
  const disabled = useMemo(() => !accounts.length, [accounts.length])

  return (
    <div ref={ref} className="relative h-[11.4rem] w-full">
      <button
        type="button"
        className={classNames(
          "flex h-full w-full items-center justify-end gap-4 overflow-hidden rounded-sm p-6 text-lg",
          "bg-black-secondary text-body-secondary transition-colors duration-75",
          !disabled && "hover:bg-grey-800 hover:text-white"
        )}
        onClick={!disabled ? handleClick : undefined}
        disabled={disabled}
      >
        {!disabled && <AllAccountsHeaderBackground accounts={accounts} />}
        {!disabled && <ChevronRightIcon className="z-10" />}
      </button>
      <TotalFiatBalance
        className="pointer-events-none absolute left-0 top-0 h-full w-full px-6"
        mouseOver={isHovered}
        disabled={disabled}
      />
    </div>
  )
}

const AllAccountsHeaderBackground: FC<{ accounts: AccountJsonAny[] }> = ({ accounts }) => {
  const colors = useAccountColors(accounts?.[0]?.address)
  const config = useMemo(() => ({ ...BG_CONFIG, colors }), [colors])

  return (
    <MysticalBackground
      className="absolute left-0 top-0 h-full w-full rounded-sm"
      config={config}
    />
  )
}
