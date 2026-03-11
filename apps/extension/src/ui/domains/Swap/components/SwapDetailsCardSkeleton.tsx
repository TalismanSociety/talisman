export const SwapDetailsCardSkeleton = () => {
  return (
    <div className="flex h-[64px] w-full items-center gap-[8px] rounded-[13px] bg-grey-900 px-[12px]">
      <div className="h-[32px] w-[32px] shrink-0 animate-pulse rounded-[20px] bg-black-tertiary" />
      <div className="flex flex-1 flex-col gap-[4px]">
        <div className="h-[14px] w-[80px] animate-pulse rounded bg-black-tertiary" />
        <div className="h-[12px] w-[120px] animate-pulse rounded bg-black-tertiary" />
      </div>
      <div className="h-[24px] w-[60px] animate-pulse rounded-[24px] bg-black-tertiary" />
    </div>
  )
}
