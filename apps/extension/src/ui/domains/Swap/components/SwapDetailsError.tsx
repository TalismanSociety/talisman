import { AlertCircleIcon } from "@talismn/icons"

export const SwapDetailsError = ({ message }: { message?: string }) => {
  return (
    <div className="flex h-[48px] items-center gap-[8px] rounded-[12px] bg-alert-warn/10 px-[12px]">
      <AlertCircleIcon className="h-[24px] w-[24px] shrink-0 text-[#f48f45]" />
      <p className="text-[#f48f45] text-[10px] leading-tight">{message}</p>
    </div>
  )
}
