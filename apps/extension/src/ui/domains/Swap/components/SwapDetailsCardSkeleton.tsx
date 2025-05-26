import { useSelectedCurrency } from "@ui/state"

import { SwapDetailsContainer } from "./SwapDetailsContainer"

export const SwapDetailsCardSkeleton = () => {
  const currency = useSelectedCurrency()

  return (
    <SwapDetailsContainer>
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col items-start">
          <div className="bg-black-tertiary animate-pulse select-none truncate rounded-sm text-sm font-bold text-transparent">
            1.000 ETH
          </div>
          <p className="bg-black-tertiary mt-1 animate-pulse select-none truncate rounded-sm text-xs font-semibold text-transparent">
            {(1.23)?.toLocaleString(undefined, { style: "currency", currency })}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <div className="bg-black-tertiary mb-1 h-10 w-10 animate-pulse rounded-full" />
          <p className="bg-black-tertiary max-w-60 animate-pulse select-none truncate rounded-sm text-xs font-semibold text-transparent">
            SimpleSwap
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 border-t border-t-[#3f3f3f] pt-4 text-xs">
        <div className="flex items-center gap-5">
          <div className="bg-black-tertiary h-[1em] w-80 animate-pulse rounded-sm" />
          <div className="text-muted-foreground bg-black-tertiary h-[1em] w-44 animate-pulse rounded-sm" />
        </div>

        <div className="bg-black-tertiary ml-auto flex h-[1em] w-20 animate-pulse items-center gap-2 rounded-sm" />
      </div>
    </SwapDetailsContainer>
  )
}
