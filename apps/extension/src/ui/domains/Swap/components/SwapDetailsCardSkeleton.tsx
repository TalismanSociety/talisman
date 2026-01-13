import { useSelectedCurrency } from "@ui/state"

import { SwapDetailsContainer } from "./SwapDetailsContainer"

export const SwapDetailsCardSkeleton = () => {
  const currency = useSelectedCurrency()

  return (
    <SwapDetailsContainer>
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col items-start">
          <div className="animate-pulse select-none truncate rounded-sm bg-black-tertiary font-bold text-sm text-transparent">
            1.000 ETH
          </div>
          <p className="mt-1 animate-pulse select-none truncate rounded-sm bg-black-tertiary font-semibold text-transparent text-xs">
            {(1.23)?.toLocaleString(undefined, { style: "currency", currency })}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <div className="mb-1 h-10 w-10 animate-pulse rounded-full bg-black-tertiary" />
          <p className="max-w-60 animate-pulse select-none truncate rounded-sm bg-black-tertiary font-semibold text-transparent text-xs">
            SimpleSwap
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 border-t border-t-[#3f3f3f] pt-4 text-xs">
        <div className="flex items-center gap-5">
          <div className="h-[1em] w-80 animate-pulse rounded-sm bg-black-tertiary" />
          <div className="h-[1em] w-44 animate-pulse rounded-sm bg-black-tertiary text-muted-foreground" />
        </div>

        <div className="ml-auto flex h-[1em] w-20 animate-pulse items-center gap-2 rounded-sm bg-black-tertiary" />
      </div>
    </SwapDetailsContainer>
  )
}
